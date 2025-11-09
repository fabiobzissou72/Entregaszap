import React, { useState, useMemo } from 'react';
import { BookOpen, Bell, Users, Send, Search, Filter, ChevronDown, CheckCircle, Trash2 } from './Icons';
import type { Delivery, Resident } from '../App';
import SendingProgressModal from './SendingProgressModal';


interface Condo {
    id: number;
    name: string;
    address: {
        street: string;
        number: string;
        neighborhood: string;
        city: string;
        state: string;
    };
    webhookUrl?: string;
}

interface ReminderProps {
    deliveries: Delivery[];
    residents: Resident[];
    condos: Condo[];
}

// Stat card component
const StatCard = ({ title, value, icon: Icon, valueColorClass = 'text-gray-900', iconColorClass }: { title: string; value: number | string; icon: React.FC<any>; valueColorClass?: string; iconColorClass: string }) => {
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-lg hover:border-gray-300 transition-all duration-300">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <p className={`text-3xl font-bold ${valueColorClass}`}>{value}</p>
            </div>
            <Icon size={28} className={iconColorClass} />
        </div>
    );
};

// Moved helper function and sub-component outside of the Reminder component to prevent re-declaration on every render and fix typing issues with the 'key' prop.
const getPendingDaysText = (dateString: string) => {
    const now = new Date();
    const receivedDate = new Date(dateString);
    const diffTime = Math.abs(now.getTime() - receivedDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Há 1 dia";
    return `Há ${diffDays} dias`;
};

// fix: Define props with an interface and use React.FC to correctly type the component and resolve the 'key' prop error.
interface DeliveryRowProps {
    delivery: Delivery & { resident: Resident };
    isSelected: boolean;
    onSelect: (id: number, checked: boolean) => void;
}

const DeliveryRow: React.FC<DeliveryRowProps> = ({ delivery, isSelected, onSelect }) => (
    <div className={`flex items-center p-4 rounded-xl transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
        <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={isSelected} onChange={(e) => onSelect(delivery.id, e.target.checked)} />
        <div className="ml-4 flex-1 grid grid-cols-5 gap-4 items-center">
            <div className="col-span-2">
                <p className="font-semibold text-gray-800">{delivery.resident.name}</p>
                <p className="text-sm text-gray-500">Apto {delivery.resident.apt} - Bloco {delivery.resident.block}</p>
            </div>
            <p className="font-mono text-sm text-gray-600">{delivery.code}</p>
            <p className="text-sm text-gray-600">{getPendingDaysText(delivery.receivedDate)}</p>
            <p className="text-sm text-gray-600">{delivery.resident.phone}</p>
        </div>
    </div>
);

export default function Reminder({ deliveries, residents, condos }: ReminderProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [dayFilter, setDayFilter] = useState('all');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [sentReminderIds, setSentReminderIds] = useState<Set<number>>(new Set());
    const [selectedSentIds, setSelectedSentIds] = useState<Set<number>>(new Set());
    const [isSending, setIsSending] = useState(false);
    const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());
    const [sendingProgress, setSendingProgress] = useState(0);
    const [currentSendingInfo, setCurrentSendingInfo] = useState('');


    const allPendingDeliveriesWithResident = useMemo(() => {
        return deliveries
            .filter(d => d.status === 'pending' && !excludedIds.has(d.id))
            .map(d => ({ ...d, resident: residents.find(r => r.id === d.residentId) }))
            .filter((d): d is Delivery & { resident: Resident } => !!d.resident);
    }, [deliveries, residents, excludedIds]);
    
    const pendingDeliveries = useMemo(() => allPendingDeliveriesWithResident.filter(d => !sentReminderIds.has(d.id)), [allPendingDeliveriesWithResident, sentReminderIds]);
    const sentDeliveries = useMemo(() => allPendingDeliveriesWithResident.filter(d => sentReminderIds.has(d.id)), [allPendingDeliveriesWithResident, sentReminderIds]);

    const applyFilters = (deliveriesToFilter: (Delivery & { resident: Resident })[]) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return deliveriesToFilter.filter(d => {
            const searchMatch = searchQuery.trim() === '' ||
                d.resident.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.resident.apt.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.resident.block.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.code.toLowerCase().includes(searchQuery.toLowerCase());

            const receivedDate = new Date(d.receivedDate);
            const receivedDay = new Date(receivedDate.getFullYear(), receivedDate.getMonth(), receivedDate.getDate());
            const diffTime = Math.abs(today.getTime() - receivedDay.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let dayMatch = true;
            switch(dayFilter) {
                case 'today': dayMatch = diffDays === 0; break;
                case 'yesterday': dayMatch = diffDays === 1; break;
                case '3days': dayMatch = diffDays >= 3; break;
                case '7days': dayMatch = diffDays >= 7; break;
                default: dayMatch = true;
            }

            return searchMatch && dayMatch;
        });
    }

    const filteredPendingDeliveries = useMemo(() => applyFilters(pendingDeliveries), [pendingDeliveries, searchQuery, dayFilter]);
    const filteredSentDeliveries = useMemo(() => applyFilters(sentDeliveries), [sentDeliveries, searchQuery, dayFilter]);
    
    const handleSelect = (id: number, checked: boolean) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if(checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };
    
    const handleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? new Set(filteredPendingDeliveries.map(d => d.id)) : new Set());
    }

    const handleSelectSent = (id: number, checked: boolean) => {
        setSelectedSentIds(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };

    const handleSelectAllSent = (checked: boolean) => {
        setSelectedSentIds(checked ? new Set(filteredSentDeliveries.map(d => d.id)) : new Set());
    };

    const generateReminderMessage = (delivery: Delivery & { resident: Resident }) => {
        const received = new Date(delivery.receivedDate);
        const date = received.toLocaleDateString('pt-BR');
        const time = received.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        return `🏢 ${delivery.resident.condo}

Olá *${delivery.resident.name}*, Passando para te lembrar que seu pedido ja chegou.

*Está aqui na portaria Des do dia !*
📅 ${date}
⏰ Hora: ${time}

Aguardamos sua presença, E não se esqueça do código para retirada do produto aqui está novamente: *${delivery.code}*

Este é um atendimento automático, Entregas ZAP, não responder.`;
    };

    const formatPhoneNumber = (phone: string) => {
        const digitsOnly = phone.replace(/\D/g, '');
        if (digitsOnly.startsWith('55')) return digitsOnly;
        return `55${digitsOnly}`;
    };

    const sendReminders = async (ids: Set<number>) => {
        if (ids.size === 0) return { successfulIds: new Set<number>(), failedIds: new Set<number>() };

        setIsSending(true);
        setSendingProgress(0);

        const remindersToSend = Array.from(ids)
            .map(id => allPendingDeliveriesWithResident.find(d => d.id === id))
            .filter((item): item is Delivery & { resident: Resident } => !!item);

        const successfulIds = new Set<number>();
        const failedIds = new Set<number>();
        const totalToSend = remindersToSend.length;

        for (let i = 0; i < totalToSend; i++) {
            const delivery = remindersToSend[i];
            setCurrentSendingInfo(`Enviando para ${delivery.resident.name} (${i + 1}/${totalToSend})`);

            // Buscar o webhook do condomínio do morador
            const residentCondo = condos.find(c => c.name.toLowerCase() === delivery.resident.condo.toLowerCase());
            const webhookUrl = residentCondo?.webhookUrl || 'https://webhook.fbzia.com.br/webhook/entregaszapnovo';

            const payload = {
                condominio: delivery.resident.condo,
                morador: delivery.resident.name,
                mensagem: generateReminderMessage(delivery),
                telefone: formatPhoneNumber(delivery.resident.phone),
            };

            try {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    successfulIds.add(delivery.id);
                } else {
                    failedIds.add(delivery.id);
                }
            } catch (error) {
                failedIds.add(delivery.id);
                console.error(`Error sending reminder for delivery ID ${delivery.id}:`, error);
            }

            setSendingProgress(((i + 1) / totalToSend) * 100);

            if (i < totalToSend - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        setIsSending(false);
        setCurrentSendingInfo('');

        return { successfulIds, failedIds };
    };

    const handleSendReminders = async () => {
        const { successfulIds, failedIds } = await sendReminders(selectedIds);
        if (successfulIds.size > 0) {
            alert(`${successfulIds.size} lembrete(s) enviado(s) com sucesso!`);
            // fix: Explicitly specify the generic type for new Set() to fix type inference issue.
            setSentReminderIds(prev => new Set<number>([...prev, ...successfulIds]));
            setSelectedIds(new Set());
        }
        if (failedIds.size > 0) {
            alert(`${failedIds.size} lembrete(s) falharam ao enviar.`);
        }
    };

    const handleResendReminders = async () => {
        const { successfulIds, failedIds } = await sendReminders(selectedSentIds);
        if (successfulIds.size > 0) alert(`${successfulIds.size} lembrete(s) reenviado(s) com sucesso!`);
        if (failedIds.size > 0) alert(`${failedIds.size} lembrete(s) falharam ao reenviar.`);
        setSelectedSentIds(new Set());
    };

    const handleDeleteSentReminders = () => {
        if (selectedSentIds.size === 0) {
            return;
        }

        // Add the selected IDs to the excluded list to automatically remove them from view.
        // fix: Explicitly specify the generic type for new Set() to fix type inference issue.
        setExcludedIds(prev => new Set<number>([...prev, ...selectedSentIds]));
    
        // Clear the current selection in the "Sent" list.
        setSelectedSentIds(new Set());
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <SendingProgressModal
                isOpen={isSending}
                progress={sendingProgress}
                currentInfo={currentSendingInfo}
            />
            <div className="flex items-center gap-3">
                <BookOpen size={28} className="text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-800">Enviar Lembretes de Retirada</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Pendentes" value={pendingDeliveries.length} icon={Bell} iconColorClass="text-orange-500" />
                <StatCard title="Selecionadas" value={selectedIds.size} icon={Users} valueColorClass="text-blue-500" iconColorClass="text-blue-500" />
                <StatCard title="Para Enviar" value={selectedIds.size} icon={Send} valueColorClass="text-green-500" iconColorClass="text-green-500" />
                <StatCard title="Enviados" value={sentDeliveries.length} icon={CheckCircle} valueColorClass="text-purple-500" iconColorClass="text-purple-500" />
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                     <div className="flex-1 min-w-[250px] relative">
                        <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Buscar por morador, apt, ou cód..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg py-2.5 pl-11 pr-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                    </div>
                    <div className="flex-1 min-w-[180px] relative">
                         <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-4 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                            <option value="all">Todos os dias</option>
                            <option value="today">Hoje</option>
                            <option value="yesterday">Ontem</option>
                            <option value="3days">Mais de 3 dias</option>
                            <option value="7days">Mais de 7 dias</option>
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Lembretes Pendentes</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleSelectAll(false)} className="flex items-center justify-center gap-2 px-4 h-[42px] bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                            <Filter size={16} />
                            Desmarcar Todas
                        </button>
                        <button onClick={handleSendReminders} disabled={selectedIds.size === 0 || isSending} className="flex items-center justify-center gap-2 px-4 h-[42px] bg-blue-600 text-white border border-blue-600 font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed">
                            <Send size={16} />
                            {isSending ? 'Enviando...' : `Enviar Lembretes (${selectedIds.size})`}
                        </button>
                    </div>
                </div>
                 <div className="border-b border-gray-200 mb-4 pb-4">
                    <div className="flex items-center px-4">
                        <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={filteredPendingDeliveries.length > 0 && selectedIds.size === filteredPendingDeliveries.length} onChange={(e) => handleSelectAll(e.target.checked)} aria-label="Selecionar todas as entregas pendentes" />
                        <div className="ml-4 flex-1 grid grid-cols-5 gap-4">
                             <p className="col-span-2 text-xs font-semibold text-gray-500 uppercase">Morador</p>
                             <p className="text-xs font-semibold text-gray-500 uppercase">Código</p>
                             <p className="text-xs font-semibold text-gray-500 uppercase">Dias Pendentes</p>
                             <p className="text-xs font-semibold text-gray-500 uppercase">Telefone</p>
                        </div>
                    </div>
                </div>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                    {filteredPendingDeliveries.length > 0 ? (
                        filteredPendingDeliveries.map(delivery => <DeliveryRow key={delivery.id} delivery={delivery} isSelected={selectedIds.has(delivery.id)} onSelect={handleSelect} />)
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-3 text-center py-16">
                            <Bell size={40} className="text-gray-300" />
                            <h3 className="text-lg font-semibold text-gray-700">Nenhuma entrega pendente</h3>
                            <p className="text-sm text-gray-500">{allPendingDeliveriesWithResident.length === 0 ? "Todas as entregas foram retiradas! 🎉" : "Tente ajustar os filtros para ver os resultados."}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Lembretes Enviados</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleSelectAllSent(false)} className="flex items-center justify-center gap-2 px-4 h-[42px] bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                            <Filter size={16} />
                            Desmarcar
                        </button>
                        <button onClick={handleResendReminders} disabled={selectedSentIds.size === 0 || isSending} className="flex items-center justify-center gap-2 px-4 h-[42px] bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed">
                            <Send size={16} />
                            {isSending && selectedIds.size === 0 ? 'Enviando...' : `Enviar Novamente (${selectedSentIds.size})`}
                        </button>
                        <button onClick={handleDeleteSentReminders} disabled={selectedSentIds.size === 0} className="flex items-center justify-center gap-2 px-4 h-[42px] bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed">
                            <Trash2 size={16} />
                            Excluir
                        </button>
                    </div>
                </div>
                 <div className="border-b border-gray-200 mb-4 pb-4">
                    <div className="flex items-center px-4">
                        <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={filteredSentDeliveries.length > 0 && selectedSentIds.size === filteredSentDeliveries.length} onChange={(e) => handleSelectAllSent(e.target.checked)} aria-label="Selecionar todas as entregas enviadas"/>
                        <div className="ml-4 flex-1 grid grid-cols-5 gap-4">
                             <p className="col-span-2 text-xs font-semibold text-gray-500 uppercase">Morador</p>
                             <p className="text-xs font-semibold text-gray-500 uppercase">Código</p>
                             <p className="text-xs font-semibold text-gray-500 uppercase">Dias Pendentes</p>
                             <p className="text-xs font-semibold text-gray-500 uppercase">Telefone</p>
                        </div>
                    </div>
                </div>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                    {filteredSentDeliveries.length > 0 ? (
                        filteredSentDeliveries.map(delivery => <DeliveryRow key={delivery.id} delivery={delivery} isSelected={selectedSentIds.has(delivery.id)} onSelect={handleSelectSent} />)
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-3 text-center py-16">
                            <CheckCircle size={40} className="text-gray-300" />
                            <h3 className="text-lg font-semibold text-gray-700">Nenhum lembrete enviado ainda</h3>
                            <p className="text-sm text-gray-500">Os lembretes que você enviar aparecerão aqui.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
