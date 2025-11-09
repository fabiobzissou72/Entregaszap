

import React, { useState, useEffect } from 'react';
import { Settings, Clock, Upload, Shield, Lock, User } from './Icons';
import { useAppContext } from '../App';

// --- Translations ---
const translations: Record<string, Record<string, string>> = {
    'pt-BR': {
        'settings.title': 'Configurações',
        'settings.tab.geral': 'Geral',
        'settings.tab.seguranca': 'Segurança',
        'settings.tab.integracoes': 'Integrações',
        'settings.profile.title': 'Perfil',
        'settings.profile.description': 'Atualize sua foto e detalhes pessoais.',
        'settings.profile.photo': 'Foto de Perfil',
        'settings.profile.changePhoto': 'Alterar Foto',
        'settings.profile.name': 'Nome',
        'settings.profile.save': 'Salvar Perfil',
        'settings.hours.title': 'Horário de Funcionamento',
        'settings.hours.description': 'Defina os horários em que a portaria pode receber entregas.',
        'settings.hours.weekdays': 'Dias da Semana',
        'settings.hours.from': 'Das',
        'settings.hours.to': 'Até',
        'settings.hours.save': 'Salvar Horários',
        'settings.lang.title': 'Idioma e Aparência',
        'settings.lang.description': 'Escolha o idioma e personalize a aparência do dashboard.',
        'settings.lang.language': 'Idioma',
        'settings.lang.primaryColor': 'Cor Principal',
        'settings.lang.save': 'Salvar Preferências',
        'settings.soon.title': 'Em Breve',
        'settings.soon.description': 'Esta seção ainda está em desenvolvimento. Volte em breve para conferir as novidades!',
    },
    'en-US': {
        'settings.title': 'Settings',
        'settings.tab.geral': 'General',
        'settings.tab.seguranca': 'Security',
        'settings.tab.integracoes': 'Integrations',
        'settings.profile.title': 'Profile',
        'settings.profile.description': 'Update your photo and personal details.',
        'settings.profile.photo': 'Profile Photo',
        'settings.profile.changePhoto': 'Change Photo',
        'settings.profile.name': 'Name',
        'settings.profile.save': 'Save Profile',
        'settings.hours.title': 'Operating Hours',
        'settings.hours.description': 'Define the hours when the concierge can receive deliveries.',
        'settings.hours.weekdays': 'Days of the Week',
        'settings.hours.from': 'From',
        'settings.hours.to': 'To',
        'settings.hours.save': 'Save Hours',
        'settings.lang.title': 'Language and Appearance',
        'settings.lang.description': 'Choose the language and customize the dashboard appearance.',
        'settings.lang.language': 'Language',
        'settings.lang.primaryColor': 'Primary Color',
        'settings.lang.save': 'Save Preferences',
        'settings.soon.title': 'Coming Soon',
        'settings.soon.description': 'This section is still under development. Check back soon for updates!',
    }
};

// Reusable component for settings sections
const SettingsSection: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 pb-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <div className="space-y-6">
            {children}
        </div>
    </div>
);

// Reusable input field
const InputField: React.FC<{ label: string; type: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; }> = ({ label, type, name, value, onChange, placeholder }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-white px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition"
        />
    </div>
);

const TabButton: React.FC<{ icon: React.FC<any>; label: string; isActive: boolean; onClick: () => void; }> = ({ icon: Icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
            isActive ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
        }`}
        style={isActive ? { backgroundColor: 'var(--primary-color)' } : {}}
    >
        <Icon size={18} />
        {label}
    </button>
);


export default function SettingsPage() {
    const { user, setUser, theme, setTheme, language, setLanguage } = useAppContext();
    const t = (key: string) => translations[language][key] || key;

    const [activeTab, setActiveTab] = useState('geral');

    // Local state for form edits, synced with context
    const [profileData, setProfileData] = useState({
        name: user.name,
        avatarFile: null as File | null,
        avatarPreview: user.avatar,
    });

    const [appearanceData, setAppearanceData] = useState({
        language: language,
        primaryColor: theme.primaryColor,
    });

    // Sync local state if context changes from elsewhere
    useEffect(() => {
        setProfileData({ name: user.name, avatarFile: null, avatarPreview: user.avatar });
    }, [user]);

    useEffect(() => {
        setAppearanceData({ language: language, primaryColor: theme.primaryColor });
    }, [language, theme]);


    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfileData(prev => ({
                ...prev,
                avatarFile: file,
                avatarPreview: URL.createObjectURL(file)
            }));
        }
    };

    const handleSaveProfile = () => {
        setUser({ name: profileData.name, avatar: profileData.avatarPreview });
        alert('Perfil salvo com sucesso!');
    };
    
    const handleSavePreferences = () => {
        setTheme({ primaryColor: appearanceData.primaryColor });
        setLanguage(appearanceData.language as 'pt-BR' | 'en-US');
        alert('Preferências salvas com sucesso!');
    };


    // State for Operating Hours (remains local as it's not used elsewhere)
    const [operatingHours, setOperatingHours] = useState({
        start: '08:00',
        end: '18:00',
        days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false }
    });
    const weekDays = [
        { key: 'mon', label: 'Seg' }, { key: 'tue', label: 'Ter' },
        { key: 'wed', label: 'Qua' }, { key: 'thu', label: 'Qui' },
        { key: 'fri', label: 'Sex' }, { key: 'sat', label: 'Sáb' },
        { key: 'sun', label: 'Dom' }
    ];
    const handleDayToggle = (day: keyof typeof operatingHours.days) => {
        setOperatingHours(prev => ({
            ...prev,
            days: { ...prev.days, [day]: !prev.days[day] }
        }));
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex items-center gap-3">
                <Settings size={28} className="text-[var(--primary-color)]" />
                <h1 className="text-3xl font-bold text-gray-800">{t('settings.title')}</h1>
            </div>

            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-2">
                <TabButton label={t('settings.tab.geral')} icon={Settings} isActive={activeTab === 'geral'} onClick={() => setActiveTab('geral')} />
                <TabButton label={t('settings.tab.seguranca')} icon={Shield} isActive={activeTab === 'seguranca'} onClick={() => setActiveTab('seguranca')} />
                <TabButton label={t('settings.tab.integracoes')} icon={Lock} isActive={activeTab === 'integracoes'} onClick={() => setActiveTab('integracoes')} />
            </div>

            {activeTab === 'geral' && (
                <div className="space-y-8 animate-fade-in-up">
                    <SettingsSection 
                        title={t('settings.profile.title')}
                        description={t('settings.profile.description')}
                    >
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.profile.photo')}</label>
                                <div className="flex items-center gap-4">
                                    {profileData.avatarPreview ? (
                                        <img src={profileData.avatarPreview} alt="Avatar preview" className="w-16 h-16 rounded-full object-cover bg-gray-100 border border-gray-200" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                                            <User size={32} className="text-gray-500" />
                                        </div>
                                    )}
                                    <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                                    <label htmlFor="avatar-upload" className="cursor-pointer px-5 py-2.5 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors text-sm flex items-center gap-2">
                                        <Upload size={16} />
                                        {t('settings.profile.changePhoto')}
                                    </label>
                                </div>
                            </div>
                            <InputField label={t('settings.profile.name')} type="text" name="name" value={profileData.name} onChange={handleProfileChange} />
                        </div>
                        <div className="flex justify-end">
                            <button onClick={handleSaveProfile} className="px-6 py-3 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--primary-color)' }}>
                                {t('settings.profile.save')}
                            </button>
                        </div>
                    </SettingsSection>

                    <SettingsSection 
                        title={t('settings.hours.title')}
                        description={t('settings.hours.description')}
                    >
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings.hours.weekdays')}</label>
                                 <div className="flex flex-wrap gap-2">
                                     {weekDays.map(day => (
                                         <button 
                                             key={day.key}
                                             onClick={() => handleDayToggle(day.key as keyof typeof operatingHours.days)}
                                             className={`w-12 h-12 rounded-lg font-semibold transition-colors border ${
                                                 operatingHours.days[day.key as keyof typeof operatingHours.days]
                                                     ? 'text-white border-[var(--primary-color)]'
                                                     : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                             }`}
                                             style={ operatingHours.days[day.key as keyof typeof operatingHours.days] ? { backgroundColor: 'var(--primary-color)' } : {}}
                                         >
                                             {day.label}
                                         </button>
                                     ))}
                                 </div>
                             </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">{t('settings.hours.from')}</label>
                                    <input type="time" id="startTime" value={operatingHours.start} onChange={(e) => setOperatingHours(p => ({...p, start: e.target.value}))} className="w-full bg-white px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"/>
                                </div>
                                <div>
                                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">{t('settings.hours.to')}</label>
                                    <input type="time" id="endTime" value={operatingHours.end} onChange={(e) => setOperatingHours(p => ({...p, end: e.target.value}))} className="w-full bg-white px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"/>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button className="px-6 py-3 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--primary-color)' }}>
                                {t('settings.hours.save')}
                            </button>
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        title={t('settings.lang.title')}
                        description={t('settings.lang.description')}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">{t('settings.lang.language')}</label>
                                <select 
                                    id="language"
                                    value={appearanceData.language}
                                    // fix: Cast e.target.value to the correct literal type to resolve TypeScript error.
                                    onChange={(e) => setAppearanceData(p => ({...p, language: e.target.value as 'pt-BR' | 'en-US'}))}
                                    className="w-full bg-white px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                                >
                                    <option value="pt-BR">Português (Brasil)</option>
                                    <option value="en-US">English (US)</option>
                                </select>
                           </div>
                            <div>
                                <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-2">{t('settings.lang.primaryColor')}</label>
                                <div className="relative">
                                    <input type="text" value={appearanceData.primaryColor.toUpperCase()} readOnly className="w-full bg-white pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none"/>
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md border border-gray-300" style={{ backgroundColor: appearanceData.primaryColor }}></div>
                                    <input 
                                        type="color" 
                                        id="primaryColor" 
                                        value={appearanceData.primaryColor} 
                                        onChange={(e) => setAppearanceData(p => ({...p, primaryColor: e.target.value}))}
                                        className="absolute left-0 top-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                         <div className="flex justify-end">
                            <button onClick={handleSavePreferences} className="px-6 py-3 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--primary-color)' }}>
                                {t('settings.lang.save')}
                            </button>
                        </div>
                    </SettingsSection>
                </div>
            )}

            {activeTab !== 'geral' && (
                <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center min-h-[400px] animate-fade-in">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                        <Clock size={32} className="text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">{t('settings.soon.title')}</h2>
                    <p className="text-gray-500 mt-2 max-w-sm">{t('settings.soon.description')}</p>
                </div>
            )}
        </div>
    );
}
