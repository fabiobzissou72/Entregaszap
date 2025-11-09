
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Package, User, CheckCircle, Clock, Info, Trash2 } from './Icons';
import type { Delivery, Resident } from '../App';
import { markAsPickedUp } from '../lib/database-helpers';
import { numberToUuid } from '../lib/adapters';

interface Condo {
    id: number;
    name: string;
    webhookUrl?: string;
}

interface PickupsProps {
    deliveries: Delivery[];
    residents: Resident[];
    condos: Condo[];
    setDeliveries: React.Dispatch<React.SetStateAction<Delivery[]>>;
    onDeletePickedUp: (deliveryId: number) => void;
    selectedIds: Set<number>;
    setSelectedIds: React.Dispatch<React.SetStateAction<Set<number>>>;
    onDeleteSelected: () => void;
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Moved DeliveryCard outside of the Pickups component to prevent re-declaration on every render and fix typing issues with the 'key' prop.
// fix: Define props with an interface and use React.FC to correctly type the component and resolve the 'key' prop error.
interface DeliveryCardProps {
    delivery: Delivery;
    resident: Resident | undefined;
    onClick: () => void;
}

const DeliveryCard: React.FC<DeliveryCardProps> = ({ delivery, resident, onClick }) => {
    if (!resident) return null;

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 transition-all hover:shadow-lg hover:border-blue-400 cursor-pointer hover:bg-blue-50"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-gray-800">{resident.name}</p>
                    <p className="text-sm text-gray-500">Apto {resident.apt} - Bloco {resident.block}</p>
                </div>
                <div className="text-xs font-mono bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md font-bold">{delivery.code}</div>
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-1.5">
                <Clock size={14} />
                <span>Recebido em: {formatDate(delivery.receivedDate)}</span>
            </div>
            <div className="text-xs text-blue-600 font-medium flex items-center gap-1">
                <Package size={14} />
                <span>Clique para preencher o código automaticamente</span>
            </div>
        </div>
    );
};

export default function Pickups({ deliveries, residents, condos, setDeliveries, onDeletePickedUp, selectedIds, setSelectedIds, onDeleteSelected }: PickupsProps) {
    const [searchCode, setSearchCode] = useState('');
    const [foundDelivery, setFoundDelivery] = useState<Delivery | null>(null);
    const [foundResident, setFoundResident] = useState<Resident | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [pickupPerson, setPickupPerson] = useState('O proprio(a)');

    const pickupOptions = [
        'O proprio(a)',
        'Filho(a)',
        'Irmão(a)',
        'Domestica do Lar',
        'Pai',
        'Mãe',
        'Avó',
        'Avô',
        'Tio(a)',
        'Marido',
        'Esposa',
        'Visita',
        'Vizinho(a)'
    ];

    // Função para formatar telefone
    const formatPhoneNumber = (phone: string) => {
        const digitsOnly = phone.replace(/\D/g, '');
        if (digitsOnly.startsWith('55')) {
            return digitsOnly;
        }
        return `55${digitsOnly}`;
    };

    // Função para gerar mensagem de confirmação de retirada
    const generatePickupMessage = (resident: Resident, code: string, pickupPerson: string) => {
        const now = new Date();
        const date = now.toLocaleDateString('pt-BR');
        const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        return `🏢 *${resident.condo}*

Olá *${resident.name}*, informamos que sua encomenda foi retirada!

✅ *Encomenda Retirada*

🔑 Código: *${code}*
👤 Retirada por: *${pickupPerson}*

📅 Data: ${date}
⏰ Hora: ${time}

Esta é uma mensagem de confirmação automática, Entregas ZAP.`;
    };

    useEffect(() => {
        if (searchCode.trim().length >= 5) {
            setIsSearching(true);
            const delivery = deliveries.find(d => d.code === searchCode.trim() && d.status === 'pending');
            if (delivery) {
                setFoundDelivery(delivery);
                const resident = residents.find(r => r.id === delivery.residentId);
                setFoundResident(resident || null);
            } else {
                setFoundDelivery(null);
                setFoundResident(null);
            }
        } else {
            setFoundDelivery(null);
            setFoundResident(null);
            setIsSearching(false);
            setPickupPerson('O proprio(a)');
        }
    }, [searchCode, deliveries, residents]);
    
    const handleConfirmPickup = async () => {
        if (!foundDelivery) return;

        try {
            console.log('🔵 Confirmando retirada da entrega:', foundDelivery.id);
            console.log('👤 Quem retirou:', pickupPerson);

            // Usar UUID real da entrega
            const entregaUuid = foundDelivery.uuid;

            if (!entregaUuid) {
                console.error('❌ UUID da entrega não encontrado. Tentando converter do ID:', foundDelivery.id);
                // Fallback: tentar buscar no cache
                const fallbackUuid = numberToUuid(foundDelivery.id);
                if (!fallbackUuid) {
                    alert('Erro: Não foi possível encontrar a entrega no sistema. Tente recarregar a página.');
                    return;
                }
                await markAsPickedUp(fallbackUuid, pickupPerson);
            } else {
                console.log('🆔 UUID da entrega:', entregaUuid);
                // Salvar no banco de dados primeiro
                await markAsPickedUp(entregaUuid, pickupPerson);
            }

            console.log('✅ Retirada salva no banco com sucesso!');

            // Atualizar estado local após sucesso no banco
            setDeliveries(prevDeliveries =>
                prevDeliveries.map(d =>
                    d.id === foundDelivery.id
                    ? { ...d, status: 'picked-up', pickupDate: new Date().toISOString(), pickupPerson: pickupPerson }
                    : d
                )
            );

            // Enviar notificação via webhook para o morador
            if (foundResident) {
                console.log('📤 Enviando notificação de retirada via webhook...');

                // Buscar webhook do condomínio
                const residentCondo = condos.find(c => c.name.toLowerCase() === foundResident.condo.toLowerCase());
                const webhookUrl = residentCondo?.webhookUrl || 'https://webhook.fbzia.com.br/webhook/entregaszapnovo';

                const message = generatePickupMessage(foundResident, foundDelivery.code, pickupPerson);

                const payload = {
                    condominio: foundResident.condo,
                    morador: foundResident.name,
                    mensagem: message,
                    telefone: formatPhoneNumber(foundResident.phone),
                    codigo_retirada: foundDelivery.code,
                    tipo: 'confirmacao_retirada',
                    retirado_por: pickupPerson
                };

                console.log('📤 Payload da notificação de retirada:', JSON.stringify(payload, null, 2));

                try {
                    const response = await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        const responseText = await response.text();
                        console.log('✅ Notificação de retirada enviada com sucesso!');
                        console.log('📥 Resposta do webhook:', responseText);
                    } else {
                        console.warn('⚠️ Webhook respondeu com erro:', response.status);
                    }
                } catch (webhookError) {
                    console.error('❌ Erro ao enviar notificação de retirada:', webhookError);
                    // Não bloquear o fluxo se o webhook falhar
                }
            }

            // Limpar formulário
            setSearchCode('');
            setFoundDelivery(null);
            setFoundResident(null);
            setPickupPerson('O proprio(a)');

            console.log('🎉 Retirada confirmada com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao confirmar retirada:', error);
            alert('Erro ao confirmar retirada no banco de dados. Por favor, tente novamente.');
        }
    };

    const pendingDeliveries = useMemo(() => 
        deliveries
            .filter(d => d.status === 'pending')
            .sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime()),
        [deliveries]
    );

    const pickedUpDeliveries = useMemo(() => 
        deliveries
            .filter(d => d.status === 'picked-up' && d.pickupDate)
            .sort((a, b) => new Date(b.pickupDate!).getTime() - new Date(a.pickupDate!).getTime()),
        [deliveries]
    );

    const getResidentById = (residentId: number) => {
        return residents.find(r => r.id === residentId);
    };

    const handleSelect = (id: number, checked: boolean) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(pickedUpDeliveries.map(d => d.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const isAllSelected = useMemo(() => {
        if (pickedUpDeliveries.length === 0) return false;
        return pickedUpDeliveries.every(d => selectedIds.has(d.id));
    }, [pickedUpDeliveries, selectedIds]);

    // Função para preencher o código automaticamente ao clicar na entrega
    const handleDeliveryCardClick = (code: string) => {
        setSearchCode(code);
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-3">
                <Package size={28} className="text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-800">Retirada de Encomendas</h1>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <h2 className="text-xl font-semibold text-gray-800">Buscar Encomenda por Código</h2>
                <div className="max-w-xl relative">
                    <Search size={22} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Digite o código de 5 dígitos..."
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value)}
                        className="w-full bg-white text-lg pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        maxLength={5}
                    />
                </div>
            </div>

            { (isSearching || foundDelivery) && (
                 <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm animate-fade-in-up">
                    { foundResident && foundDelivery ? (
                         <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Detalhes da Encomenda</h3>
                             <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-gray-900">{foundResident.name}</p>
                                        <p className="text-gray-600">Apto {foundResident.apt} - Bloco {foundResident.block}</p>
                                    </div>
                                </div>
                                <p className="text-gray-600 font-medium">Telefone: <span className="text-gray-800">{foundResident.phone}</span></p>
                                
                                <div>
                                    <label htmlFor="pickupPerson" className="block text-sm font-medium text-gray-700 mb-2">Quem retirou?</label>
                                    <select
                                        id="pickupPerson"
                                        value={pickupPerson}
                                        onChange={(e) => setPickupPerson(e.target.value)}
                                        className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {pickupOptions.map(option => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={handleConfirmPickup}
                                    className="w-full flex items-center justify-center gap-3 py-3 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl font-semibold text-base hover:shadow-lg transition-all"
                                >
                                    <CheckCircle size={20} />
                                    Confirmar Retirada
                                </button>
                             </div>
                         </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center gap-3 text-center py-8">
                            <Info size={40} className="text-gray-300" />
                            <h3 className="text-lg font-semibold text-gray-700">Encomenda não encontrada</h3>
                            <p className="text-sm text-gray-500 max-w-sm">
                                O código digitado não corresponde a nenhuma encomenda pendente. Verifique o código e tente novamente.
                            </p>
                        </div>
                    )}
                 </div>
            )}


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pending Column */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-800">Encomendas Pendentes</h2>
                        <span className="bg-orange-100 text-orange-800 text-sm font-bold px-3 py-1 rounded-full">{pendingDeliveries.length}</span>
                    </div>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {pendingDeliveries.length > 0 ? (
                            pendingDeliveries.map(d => (
                                <DeliveryCard
                                    key={d.id}
                                    delivery={d}
                                    resident={getResidentById(d.residentId)}
                                    onClick={() => handleDeliveryCardClick(d.code)}
                                />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-3 text-center py-16">
                                <CheckCircle size={40} className="text-green-400" />
                                <h3 className="text-lg font-semibold text-gray-700">Tudo em dia!</h3>
                                <p className="text-sm text-gray-500">Nenhuma encomenda pendente no momento.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Picked-up Column */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                     <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold text-gray-800">Encomendas Retiradas</h2>
                            <span className="bg-green-100 text-green-800 text-sm font-bold px-3 py-1 rounded-full">{pickedUpDeliveries.length}</span>
                        </div>
                        <button 
                            onClick={onDeleteSelected}
                            disabled={selectedIds.size === 0}
                            className="flex items-center justify-center gap-2 px-4 h-[42px] bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Trash2 size={16} />
                            Excluir ({selectedIds.size})
                        </button>
                    </div>
                     <div className="border-b border-gray-200 mb-4 pb-4">
                        <div className="flex items-center px-4">
                            <input 
                                type="checkbox" 
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                                checked={isAllSelected}
                                onChange={(e) => handleSelectAll(e.target.checked)}
                                aria-label="Selecionar todas as retiradas"
                            />
                            <label htmlFor="select-all-picked-up" className="ml-3 text-sm font-medium text-gray-600">Selecionar Tudo</label>
                        </div>
                    </div>
                     <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                         {pickedUpDeliveries.length > 0 ? (
                            pickedUpDeliveries.map(d => {
                                const resident = getResidentById(d.residentId);
                                if (!resident) return null;
                                return (
                                    <div key={d.id} className={`p-4 rounded-2xl flex items-center gap-4 transition-colors ${selectedIds.has(d.id) ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                                            checked={selectedIds.has(d.id)}
                                            onChange={(e) => handleSelect(d.id, e.target.checked)}
                                            aria-label={`Selecionar retirada ${d.code}`}
                                        />
                                        <div className="flex-grow space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-gray-700">{resident.name}</p>
                                                    <p className="text-sm text-gray-500">Apto {resident.apt} - Bloco {resident.block}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-xs font-mono bg-gray-200 text-gray-600 px-2 py-1 rounded-md">{d.code}</div>
                                                    <button
                                                        onClick={() => onDeletePickedUp(d.id)}
                                                        className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
                                                        aria-label="Excluir retirada do histórico"
                                                        title="Excluir do Histórico"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1.5">
                                                <CheckCircle size={14} className="text-green-500" />
                                                <span>Retirado em: {formatDate(d.pickupDate!)}</span>
                                            </div>
                                            {d.pickupPerson && (
                                                <div className="text-xs text-gray-500 flex items-center gap-1.5">
                                                    <User size={14} />
                                                    <span>Retirado por: {d.pickupPerson}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                         ) : (
                             <div className="flex flex-col items-center justify-center gap-3 text-center py-16">
                                <Package size={40} className="text-gray-300" />
                                <h3 className="text-lg font-semibold text-gray-700">Nenhuma retirada registrada</h3>
                                <p className="text-sm text-gray-500">As encomendas retiradas aparecerão aqui.</p>
                            </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
}