
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Package, Camera, CheckCircle, X, Info, Users, Car, GasCylinder, Motorcycle, Send, User } from './Icons';
import type { Delivery, Employee } from '../App';
import SendingProgressModal from './SendingProgressModal';
import { uploadPhoto } from '../lib/storage-helpers';


interface Condo {
  id: number;
  name: string;
}

interface Resident {
    id: number;
    name: string;
    apt: string;
    block: string;
    condo: string;
    phone: string;
}

interface NewDeliveryProps {
    condos: Condo[];
    residents: Resident[];
    employees: Employee[];
    addDelivery: (deliveryData: Omit<Delivery, 'id' | 'receivedDate' | 'status'>) => void;
}

const services = [
    { name: 'Encomendas/Produtos', icon: Package },
    { name: 'Delivery', icon: Motorcycle },
    { name: 'Gás', icon: GasCylinder },
    { name: 'Visita', icon: Users },
    { name: 'Uber', icon: Car },
    { name: '99', icon: Car },
    { name: 'Taxi', icon: Car },
];


export default function NewDelivery({ condos, residents, employees, addDelivery }: NewDeliveryProps) {
    const [condo, setCondo] = useState('');
    const [block, setBlock] = useState('');
    const [apt, setApt] = useState('');
    const [availableBlocks, setAvailableBlocks] = useState<string[]>([]);
    const [availableApts, setAvailableApts] = useState<string[]>([]);
    const [selectedService, setSelectedService] = useState<string | null>(null);
    const [packagePhoto, setPackagePhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [matchedResidents, setMatchedResidents] = useState<Resident[]>([]);
    const [selectedResidentIds, setSelectedResidentIds] = useState<Set<number>>(new Set());
    const [retrievalCode, setRetrievalCode] = useState<string>(''); // Código fixo gerado uma única vez
    const [observation, setObservation] = useState<string>(''); // Campo de observação

    const [isSending, setIsSending] = useState(false);
    const [sendingProgress, setSendingProgress] = useState(0);
    const [currentSendingInfo, setCurrentSendingInfo] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    
    const [showCamera, setShowCamera] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const uniqueCondoNames = useMemo(() => {
        const allCondoNames = [...new Set(residents.map(r => r.condo))];
        return allCondoNames.sort();
    }, [residents]);


    // Find available blocks when a condo is selected
    useEffect(() => {
        if (condo) {
            const residentsInCondo = residents.filter(r =>
                r.condo?.trim().toLowerCase() === condo.trim().toLowerCase()
            );
            const uniqueBlocks = [...new Set(residentsInCondo.map(r => (r.block || '').trim()))].sort();
            setAvailableBlocks(uniqueBlocks);

            console.log('Blocos disponíveis:', {
                condo,
                residentsFound: residentsInCondo.length,
                blocks: uniqueBlocks
            });
        } else {
            setAvailableBlocks([]);
        }
        setBlock('');
        setApt('');
        setAvailableApts([]);
        setMatchedResidents([]);
        setSelectedResidentIds(new Set());
    }, [condo, residents]);

    // Find available apartments when a block is selected OR when no blocks
    useEffect(() => {
        if (condo) {
            const residentsInBlock = residents.filter(r => {
                const condoMatch = r.condo?.trim().toLowerCase() === condo.trim().toLowerCase();
                // Se block estiver vazio, aceita todos; senão, filtra pelo bloco
                const blockMatch = !block || (r.block || '').trim().toLowerCase() === block.trim().toLowerCase();
                return condoMatch && blockMatch;
            });
            const aptsInBlock = [...new Set(residentsInBlock.map(r => (r.apt || '').trim()))].sort();
            setAvailableApts(aptsInBlock);

            console.log('Apartamentos disponíveis:', {
                condo,
                block: block || 'Sem Bloco',
                residentsFound: residentsInBlock.length,
                apartments: aptsInBlock
            });
        } else {
            setAvailableApts([]);
        }
        setApt('');
        setMatchedResidents([]);
        setSelectedResidentIds(new Set());
    }, [condo, block, residents]);


    // Find the resident when all fields are selected
    useEffect(() => {
        if (condo && apt) {
            const residentsInApt = residents.filter(r => {
                const condoMatch = r.condo?.trim().toLowerCase() === condo.trim().toLowerCase();
                // Se block estiver vazio, aceita qualquer bloco; senão, filtra
                const blockMatch = !block || (r.block || '').trim().toLowerCase() === block.trim().toLowerCase();
                const aptMatch = (r.apt || '').trim().toLowerCase() === apt.trim().toLowerCase();

                return condoMatch && blockMatch && aptMatch;
            });

            console.log('Filtrando moradores:', {
                condo,
                block: block || 'Qualquer Bloco',
                apt,
                totalResidents: residents.length,
                matched: residentsInApt.length,
                residentsInApt
            });

            setMatchedResidents(residentsInApt);
        } else {
            setMatchedResidents([]);
        }
        setSelectedResidentIds(new Set());
    }, [condo, block, apt, residents]);

    // Gerar código de retirada UMA ÚNICA VEZ quando selecionar "Encomendas/Produtos"
    useEffect(() => {
        if (selectedService === 'Encomendas/Produtos') {
            // Só gera um novo código se ainda não existir
            if (!retrievalCode) {
                const newCode = Math.floor(10000 + Math.random() * 90000).toString();
                setRetrievalCode(newCode);
                console.log('🔢 Código de retirada gerado:', newCode);
            }
        } else {
            // Limpa o código se mudar para outro serviço
            setRetrievalCode('');
        }
    }, [selectedService, retrievalCode]);

    const processPhotoFile = (file: File) => {
        setPackagePhoto(file);
        setUploadSuccess(false);
        setIsUploading(true);
        setUploadProgress(0);

        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Simulate upload
        const timer = setInterval(() => {
            setUploadProgress((prevProgress) => {
                if (prevProgress >= 100) {
                    clearInterval(timer);
                    setIsUploading(false);
                    setUploadSuccess(true);
                    return 100;
                }
                const newProgress = prevProgress + Math.floor(Math.random() * 20) + 10;
                return newProgress > 100 ? 100 : newProgress;
            });
        }, 200);
    };

    const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
           processPhotoFile(file);
        }
    };
    
    const removePhoto = () => {
        setPackagePhoto(null);
        setPhotoPreview(null);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadSuccess(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
    
    const openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setShowCamera(true);
        } catch (err) {
            console.error("Error accessing back camera, trying front: ", err);
             try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setCameraStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setShowCamera(true);
            } catch (fallbackErr) {
                console.error("Error accessing camera: ", fallbackErr);
                alert("Não foi possível acessar a câmera. Verifique as permissões do seu navegador.");
            }
        }
    };

    const closeCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        setCameraStream(null);
        setShowCamera(false);
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas) {
            const width = video.videoWidth;
            const height = video.videoHeight;
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                if (blob) {
                    const photoFile = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
                    processPhotoFile(photoFile);
                    closeCamera();
                }
            }, 'image/jpeg');
        }
    };

    const resetForm = () => {
        setCondo('');
        setBlock('');
        setApt('');
        setSelectedService(null);
        removePhoto();
        setMatchedResidents([]);
        setSelectedResidentIds(new Set());
        setRetrievalCode(''); // Limpar o código ao resetar
        setObservation(''); // Limpar observação
        console.log('🔄 Formulário resetado, código limpo');
    }
    
    const getServiceMessageDetail = (service: string) => {
        switch(service.toLowerCase()) {
            case 'delivery': return 'seu Delivery chegou';
            case 'gás': return 'Seu gás chegou';
            case 'visita': return 'Sua visita chegou';
            case 'uber': case '99': case 'taxi': return `Seu ${service} chegou`;
            default: return `Sua encomenda (${service}) chegou`;
        }
    }

    const generateMessage = (resident: Resident) => {
        if (!resident || !selectedService) return null;

        const now = new Date();
        const date = now.toLocaleDateString('pt-BR');
        const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        if (selectedService === 'Encomendas/Produtos') {
            // Usar o código fixo do estado ao invés de gerar novo
            return {
                message: `🏢 *${resident.condo}*

Olá *${resident.name}*, você tem uma nova encomenda!

📦 Sua Encomenda Chegou!

📅 Data: ${date}
⏰ Hora: ${time}

🔑 Código de retirada na portaria: *${retrievalCode}*

Esta é uma mensagem de atendimento automático, Entregas ZAP.`,
                code: retrievalCode
            };
        }

        const serviceMessage = getServiceMessageDetail(selectedService);
        return {
            message: `🏢 *${resident.condo}*

Olá *${resident.name}*, Passando só pra te dizer que 

📦 *${serviceMessage}*

📅 Data: ${date}
⏰ Hora: ${time}

Este é um atendimento automático, Entregas ZAP.`
        };
    }

    const formatPhoneNumber = (phone: string) => {
        const digitsOnly = phone.replace(/\D/g, '');
        if (digitsOnly.startsWith('55')) {
            return digitsOnly;
        }
        return `55${digitsOnly}`;
    };

    const handleSendMessage = async () => {
        if (selectedResidentIds.size === 0 || !selectedService) return;

        setIsSending(true);

        // Fazer upload da foto primeiro, se houver
        let photoUrl: string | null = null;
        if (packagePhoto) {
            console.log('📸 Iniciando upload da foto...', packagePhoto.name);
            setCurrentSendingInfo('Fazendo upload da foto...');
            photoUrl = await uploadPhoto(packagePhoto, 'entrega');

            if (photoUrl) {
                console.log('✅ Upload da foto bem-sucedido!');
                console.log('🔗 URL da foto:', photoUrl);
            } else {
                console.error('❌ Erro ao fazer upload da foto');
                alert('Erro ao fazer upload da foto. Continuando sem a foto...');
            }
        } else {
            console.log('ℹ️ Nenhuma foto selecionada');
        }

        // Buscar o webhook do condomínio selecionado
        const selectedCondo = condos.find(c => c.name.toLowerCase() === condo.toLowerCase());
        const webhookUrl = selectedCondo?.webhookUrl || 'https://webhook.fbzia.com.br/webhook/entregaszapnovo';

        const residentsToNotify = matchedResidents.filter(r => selectedResidentIds.has(r.id));
        const totalToSend = residentsToNotify.length;

        let successCount = 0;
    
        for (let i = 0; i < totalToSend; i++) {
            const resident = residentsToNotify[i];
            setCurrentSendingInfo(`Enviando para ${resident.name} (${i + 1}/${totalToSend})`);
            
            const messageData = generateMessage(resident);
            if (!messageData) continue;
    
            const payload: any = {
                condominio: resident.condo,
                morador: resident.name,
                mensagem: messageData.message,
                telefone: formatPhoneNumber(resident.phone),
            };

            // Adicionar foto_url se houver
            if (photoUrl) {
                payload.foto_url = photoUrl;
                console.log('📸 foto_url adicionada ao payload:', photoUrl);
            } else {
                console.log('⚠️ Nenhuma foto_url para adicionar ao payload');
            }

            // Adicionar observação se houver
            if (observation && observation.trim()) {
                payload.observacao = observation.trim();
                console.log('📝 Observação adicionada ao payload:', observation.trim());
            }

            if (selectedService === 'Encomendas/Produtos' && messageData.code) {
                payload.codigo_retirada = messageData.code;
            } else {
                payload.servico = selectedService;
            }

            console.log('📤 Enviando para webhook:', webhookUrl);
            console.log('📤 Payload do webhook:', JSON.stringify(payload, null, 2));

            try {
                console.log('⏳ Iniciando requisição para webhook...');
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                console.log(`📊 Resposta do webhook - Status: ${response.status} ${response.statusText}`);

                // Tentar ler a resposta
                const responseText = await response.text();
                console.log('📥 Resposta do webhook:', responseText);

                if (response.ok) {
                    console.log('✅ Webhook respondeu OK');
                    console.log('🔍 selectedService:', selectedService);
                    console.log('🔍 messageData.code:', messageData?.code);

                    if (selectedService === 'Encomendas/Produtos' && messageData.code) {
                        console.log('✅ É ENCOMENDA! Vou salvar no banco...');

                        const activeEmployees = employees.filter(e => e.active);
                        console.log('👷 Funcionários ativos:', activeEmployees.length);

                        const randomEmployee = activeEmployees.length > 0 ? activeEmployees[Math.floor(Math.random() * activeEmployees.length)] : null;
                        console.log('👷 Funcionário selecionado:', randomEmployee?.name || 'NENHUM');

                        const deliveryData = {
                            code: messageData.code,
                            residentId: resident.id,
                            employeeId: randomEmployee ? randomEmployee.id : 0,
                            photoUrl: photoUrl || undefined,
                            observation: observation && observation.trim() ? observation.trim() : undefined,
                        };

                        console.log('💾 Salvando entrega no banco com dados:', deliveryData);
                        console.log('📸 photoUrl sendo salvo:', photoUrl || 'NENHUMA');
                        console.log('📝 Observação sendo salva:', observation || 'NENHUMA');
                        console.log('🔵 CHAMANDO addDelivery AGORA...');

                        try {
                            console.log('⏳ Antes do await addDelivery...');
                            await addDelivery(deliveryData);
                            console.log('✅✅✅ addDelivery COMPLETOU com sucesso!');
                        } catch (deliveryError) {
                            console.error('❌❌❌ ERRO ao chamar addDelivery:', deliveryError);
                            console.error('Stack trace:', deliveryError.stack);
                        }
                    } else {
                        console.log('⚠️ NÃO é encomenda OU sem código. Não vai salvar no banco.');
                    }
                    successCount++;
                } else {
                     console.error(`❌ Falha no webhook para ${resident.name}:`, response.status, response.statusText);
                     console.error('❌ Resposta completa:', responseText);
                }
            } catch (error) {
                console.error(`❌ ERRO CRÍTICO ao enviar para ${resident.name}:`, error);
                console.error('❌ Tipo do erro:', error.name);
                console.error('❌ Mensagem do erro:', error.message);
                console.error('❌ Stack:', error.stack);

                // Verificar se é erro de CORS
                if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
                    console.error('🚨 POSSÍVEL ERRO DE CORS!');
                    console.error('💡 O webhook precisa permitir requisições de:', window.location.origin);
                }
            }
            setSendingProgress(((i + 1) / totalToSend) * 100);
            if (i < totalToSend -1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    
        setIsSending(false);
        alert(`${successCount} de ${totalToSend} mensagens enviadas com sucesso!`);
        if (successCount > 0) {
            resetForm();
        }
    };
    
    const residentForPreview = useMemo(() => {
        if (selectedResidentIds.size === 0) return null;
        const firstId = Array.from(selectedResidentIds)[0];
        return matchedResidents.find(r => r.id === firstId);
    }, [selectedResidentIds, matchedResidents]);

    const messagePreview = residentForPreview ? generateMessage(residentForPreview)?.message : 'Selecione um morador para ver a pré-visualização.';


    return (
        <div className="space-y-6 animate-fade-in">
             <SendingProgressModal
                isOpen={isSending}
                progress={sendingProgress}
                currentInfo={currentSendingInfo}
            />
             {showCamera && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 p-4 animate-fade-in">
                    <video ref={videoRef} autoPlay playsInline muted className="max-w-full max-h-[70vh] w-auto h-auto rounded-lg shadow-lg mb-4"></video>
                    <canvas ref={canvasRef} className="hidden"></canvas>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            type="button"
                            onClick={capturePhoto}
                            className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all text-lg shadow-lg"
                        >
                            <Camera size={24} />
                            Capturar Foto
                        </button>
                        <button
                            type="button"
                            onClick={closeCamera}
                            className="flex items-center justify-center gap-3 px-8 py-4 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all text-lg"
                        >
                            <X size={24} />
                            Fechar
                        </button>
                    </div>
                </div>
            )}
            <div className="flex items-center gap-3">
                <Package size={28} className="text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-800">Registrar Nova Entrega</h1>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">Selecione Para o envio</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Condomínio</label>
                            <select 
                                value={condo}
                                onChange={(e) => setCondo(e.target.value)}
                                className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Selecione...</option>
                                {uniqueCondoNames.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Bloco/Torre (Opcional)</label>
                            <select
                                value={block}
                                onChange={(e) => setBlock(e.target.value)}
                                className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                disabled={!condo}
                            >
                                <option value="">Sem Bloco / Selecione...</option>
                                {availableBlocks.map(b => <option key={b} value={b}>{b || 'Sem Bloco'}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Apartamento</label>
                            <select
                                value={apt}
                                onChange={(e) => setApt(e.target.value)}
                                className="w-full bg-white px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                required
                                disabled={!condo || availableApts.length === 0}
                            >
                                <option value="">Selecione...</option>
                                {availableApts.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>

                    {matchedResidents.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">Moradores Encontrados</h3>
                            <p className="text-sm text-gray-500 mb-4">Selecione o(s) morador(es) para notificar.</p>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                {matchedResidents.map(resident => (
                                    <label
                                        key={resident.id}
                                        htmlFor={`res-${resident.id}`}
                                        className={`p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all duration-200 ${
                                            selectedResidentIds.has(resident.id)
                                                ? 'bg-blue-50 border-blue-400 shadow-md'
                                                : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            id={`res-${resident.id}`}
                                            checked={selectedResidentIds.has(resident.id)}
                                            onChange={(e) => {
                                                const newSet = new Set(selectedResidentIds);
                                                if (e.target.checked) {
                                                    newSet.add(resident.id);
                                                } else {
                                                    newSet.delete(resident.id);
                                                }
                                                setSelectedResidentIds(newSet);
                                            }}
                                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                                        />
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border">
                                            <User size={24} className="text-gray-500" />
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="font-bold text-gray-800 truncate" title={resident.name}>{resident.name}</p>
                                            <p className="text-sm text-gray-500">Apto {resident.apt} - Bloco {resident.block}</p>
                                        </div>
                                        <p className="text-sm font-mono text-gray-600 flex-shrink-0 hidden sm:block">{resident.phone}</p>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    { apt && matchedResidents.length === 0 && (
                        <div className="mt-6 bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-center gap-3">
                            <Info size={20} className="text-yellow-600" />
                            <div>
                                <p className="font-semibold text-yellow-800">Nenhum morador encontrado</p>
                                <p className="text-sm text-yellow-700">Não há moradores cadastrados para este apartamento.</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">Tipo de Serviço</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-4">
                        {services.map(service => {
                            const Icon = service.icon;
                            const isSelected = selectedService === service.name;
                            return (
                                <button
                                    key={service.name}
                                    type="button"
                                    onClick={() => setSelectedService(service.name)}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                                        isSelected
                                        ? 'bg-blue-50 border-blue-500 shadow-md'
                                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon size={28} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />
                                    <span className={`text-sm font-medium text-center ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                                        {service.name.includes('/') ? (
                                            <>
                                                {service.name.split('/')[0]}
                                                <br />
                                                {service.name.split('/')[1]}
                                            </>
                                        ) : (
                                            service.name
                                        )}
                                    </span>
                                </button>
                            );
                        })}
                        </div>
                        {selectedService === 'Encomendas/Produtos' && retrievalCode && (
                        <div className="mt-6 p-4 bg-green-50 border-2 border-green-300 rounded-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-green-800 mb-1">✅ Código de Retirada Gerado</p>
                                    <p className="text-xs text-green-600">Este código será usado para todas as mensagens desta entrega</p>
                                </div>
                                <div className="bg-white px-6 py-3 rounded-lg border-2 border-green-400">
                                    <p className="text-2xl font-mono font-bold text-green-700">{retrievalCode}</p>
                                </div>
                            </div>
                        </div>
                        )}
                        {selectedResidentIds.size > 0 && selectedService && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Pré-visualização da Mensagem</h3>
                            <div className="bg-gray-100 p-4 rounded-xl text-gray-700 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                                {messagePreview}
                            </div>
                            <button
                                type="button"
                                onClick={handleSendMessage}
                                disabled={isSending || selectedResidentIds.size === 0 || !selectedService}
                                className="mt-4 w-full flex items-center justify-center gap-3 py-3 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl font-semibold text-base hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <Send size={20} />
                                {isSending ? 'Enviando...' : `Enviar Mensagem para ${selectedResidentIds.size} morador(es)`}
                            </button>
                        </div>
                        )}
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">Foto (Opcional)</h2>
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 text-center min-h-[200px]">
                        {isUploading ? (
                            <div className="w-full max-w-sm">
                                <p className="text-gray-600 mb-4 font-medium">Enviando imagem...</p>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                                <p className="text-sm text-gray-500 mt-2">{uploadProgress}%</p>
                            </div>
                        ) : uploadSuccess && photoPreview ? (
                            <div className="w-full flex flex-col items-center justify-center">
                                <div className="relative w-full max-w-sm mx-auto mb-4">
                                    <img src={photoPreview} alt="Preview da encomenda" className="w-full h-auto max-h-48 object-contain rounded-lg" />
                                    <button 
                                        type="button"
                                        onClick={removePhoto}
                                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                                        aria-label="Remover foto"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                                    <CheckCircle size={20} />
                                    <p className="font-semibold text-sm">IMG adicionada com sucesso.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <Camera size={32} className="text-gray-400" />
                                </div>
                                <p className="text-gray-600 mb-2">Arraste e solte uma imagem aqui</p>
                                <p className="text-xs text-gray-400 mb-4">ou</p>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Selecione um arquivo
                                    </button>
                                     <button 
                                        type="button"
                                        onClick={openCamera}
                                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-500 border border-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                                    >
                                        <Camera size={18}/>
                                        Tirar foto
                                    </button>
                                </div>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    capture="environment"
                                    ref={fileInputRef} 
                                    onChange={handlePhotoChange} 
                                    className="hidden" 
                                />
                            </>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-4 text-center">Tamanho máximo: 5MB. Formatos: JPG, PNG.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Observações (Opcional)</h2>
                    <p className="text-sm text-gray-500 mb-4">
                        Registre aqui o estado da encomenda: rasurada, rasgada, amassada, etc.
                    </p>
                    <textarea
                        value={observation}
                        onChange={(e) => setObservation(e.target.value)}
                        placeholder="Ex: Embalagem rasgada no canto direito..."
                        rows={4}
                        maxLength={500}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-gray-400">
                            {observation ? 'Esta observação será enviada junto com a mensagem do WhatsApp' : 'Deixe em branco se a encomenda estiver em perfeito estado'}
                        </p>
                        <p className="text-xs text-gray-400">
                            {observation.length}/500
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
