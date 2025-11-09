import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Filter, Download, Calendar, ChevronDown, Package, X, ArrowLeft, RefreshCw, Clock, Bell, CheckCircle, Trash2 } from './Icons';
import type { Delivery, Resident, Employee } from '../App';

interface DeliveryReportsProps {
    deliveries: Delivery[];
    residents: Resident[];
    employees: Employee[];
    onDeleteDelivery: (deliveryId: number) => void;
    selectedIds: Set<number>;
    setSelectedIds: React.Dispatch<React.SetStateAction<Set<number>>>;
    onDeleteSelected: () => void;
}

// Reusable component for select dropdowns
const SelectInput = ({ label, options, value, onChange, placeholder }: { label: string, options: {value: string, label: string}[], value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, placeholder: string }) => (
  <div>
    <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
    <div className="relative">
      <select 
        value={value}
        onChange={onChange}
        className="w-full appearance-none bg-white border border-gray-200 rounded-lg py-2.5 pl-4 pr-10 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        aria-label={label}
      >
        <option value="">{placeholder}</option>
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  </div>
);

const CalendarPopup = ({
    selectedDate,
    onDateSelect,
    closeCalendar,
}: {
    selectedDate: Date | null;
    onDateSelect: (date: Date) => void;
    closeCalendar: () => void;
}) => {
    const [displayDate, setDisplayDate] = useState(selectedDate || new Date());

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startingDay = firstDayOfMonth(year, month);

    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const handlePrevMonth = () => {
        setDisplayDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setDisplayDate(new Date(year, month + 1, 1));
    };
    
    const handleDayClick = (day: number) => {
      const newDate = new Date(year, month, day);
      onDateSelect(newDate);
      closeCalendar();
    }

    return (
        <div className="absolute top-full mt-2 w-72 bg-white rounded-xl border border-gray-200 shadow-lg p-4 z-10 animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
                <button onClick={handlePrevMonth} className="p-1.5 rounded-full hover:bg-gray-100">&lt;</button>
                <p className="font-semibold text-gray-800">
                    {displayDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                </p>
                <button onClick={handleNextMonth} className="p-1.5 rounded-full hover:bg-gray-100">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {weekdays.map(day => <div key={day} className="font-medium text-gray-500">{day.charAt(0)}</div>)}
                {Array.from({ length: startingDay }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {Array.from({ length: totalDays }).map((_, i) => {
                    const day = i + 1;
                    const isSelected = selectedDate && 
                        selectedDate.getDate() === day &&
                        selectedDate.getMonth() === month &&
                        selectedDate.getFullYear() === year;
                    
                    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

                    return (
                        <button 
                            key={day}
                            onClick={() => handleDayClick(day)}
                            className={`w-9 h-9 rounded-full transition-colors ${
                                isSelected ? 'bg-blue-600 text-white' : 
                                isToday ? 'bg-blue-100 text-blue-700' : 
                                'text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {day}
                        </button>
                    )
                })}
            </div>
        </div>
    );
};

// Reusable component for date inputs
const DateInput = ({ label, selectedDate, onDateChange }: { label: string; selectedDate: Date | null; onDateChange: (date: Date | null) => void; }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);
    
    const formattedDate = selectedDate ? selectedDate.toLocaleDateString('pt-BR') : '';

    return (
        <div ref={wrapperRef}>
            <label htmlFor={label} className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
            <div className="relative">
                <div 
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full bg-white border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer flex items-center"
                >
                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    {formattedDate || <span className="text-gray-400">dd/mm/aaaa</span>}
                </div>
                {isOpen && <CalendarPopup selectedDate={selectedDate} onDateSelect={onDateChange} closeCalendar={() => setIsOpen(false)} />}
            </div>
        </div>
    );
};

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


// Main component
export default function DeliveryReports({ deliveries, residents, employees, onDeleteDelivery, selectedIds, setSelectedIds, onDeleteSelected }: DeliveryReportsProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [employeeFilter, setEmployeeFilter] = useState('');
    const [residentFilter, setResidentFilter] = useState('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const filteredDeliveries = useMemo(() => {
        return deliveries.filter(delivery => {
            const resident = residents.find(r => r.id === delivery.residentId);
            const employee = employees.find(e => e.id === delivery.employeeId);
            const receivedDate = new Date(delivery.receivedDate);

            // Search query filter
            const searchMatch = appliedSearchQuery.toLowerCase() === '' ||
                delivery.code.toLowerCase().includes(appliedSearchQuery.toLowerCase()) ||
                resident?.name.toLowerCase().includes(appliedSearchQuery.toLowerCase()) ||
                employee?.name.toLowerCase().includes(appliedSearchQuery.toLowerCase());

            // Status filter
            const statusMatch = statusFilter === '' || delivery.status === statusFilter;

            // Employee filter
            const employeeMatch = employeeFilter === '' || delivery.employeeId === parseInt(employeeFilter);

            // Resident filter
            const residentMatch = residentFilter === '' || delivery.residentId === parseInt(residentFilter);

            // Date filter
            const startDateMatch = !startDate || receivedDate >= new Date(startDate.setHours(0, 0, 0, 0));
            const endDateMatch = !endDate || receivedDate <= new Date(endDate.setHours(23, 59, 59, 999));
            
            return searchMatch && statusMatch && employeeMatch && residentMatch && startDateMatch && endDateMatch;
        });
    }, [deliveries, appliedSearchQuery, statusFilter, employeeFilter, residentFilter, startDate, endDate, residents, employees]);

    const handleSearch = () => {
        setAppliedSearchQuery(searchQuery);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };
    
    const clearFilters = () => {
        setSearchQuery('');
        setAppliedSearchQuery('');
        setStatusFilter('');
        setEmployeeFilter('');
        setResidentFilter('');
        setStartDate(null);
        setEndDate(null);
    };

    const handleQuickDateFilter = (filter: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        switch(filter) {
            case 'Hoje':
                setStartDate(today);
                setEndDate(endOfToday);
                break;
            case 'Ontem':
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                const endOfYesterday = new Date(yesterday);
                endOfYesterday.setHours(23, 59, 59, 999);
                setStartDate(yesterday);
                setEndDate(endOfYesterday);
                break;
            case 'Últimos 7 dias':
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(today.getDate() - 6);
                setStartDate(sevenDaysAgo);
                setEndDate(endOfToday);
                break;
            case 'Este mês':
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                setStartDate(firstDayOfMonth);
                setEndDate(endOfToday);
                break;
        }
    };
    
    const formatDeliveryToCSVRow = (delivery: Delivery) => {
        const resident = residents.find(r => r.id === delivery.residentId);
        const employee = employees.find(e => e.id === delivery.employeeId);
        return [
            delivery.code,
            resident?.name || 'N/A',
            `${resident?.apt || 'N/A'} / ${resident?.block || 'N/A'}`,
            employee?.name || 'N/A',
            delivery.status === 'pending' ? 'Pendente' : 'Retirada',
            new Date(delivery.receivedDate).toLocaleString('pt-BR'),
            delivery.pickupDate ? new Date(delivery.pickupDate).toLocaleString('pt-BR') : '',
            delivery.pickupPerson || ''
        ].join(';');
    };

    const triggerCSVDownload = (csvContent: string, filename: string) => {
        const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToCSV = () => {
        const headers = ["Código", "Morador", "Apto/Bloco", "Funcionário", "Status", "Data Entrega", "Data Retirada", "Retirado Por"];
        const rows = filteredDeliveries.map(formatDeliveryToCSVRow);
        const csvContent = [headers.join(';'), ...rows].join('\n');
        triggerCSVDownload(csvContent, "relatorio_entregas.csv");
    };

    const exportSingleDeliveryToCSV = (deliveryId: number) => {
        const delivery = filteredDeliveries.find(d => d.id === deliveryId);
        if (!delivery) return;

        const headers = ["Código", "Morador", "Apto/Bloco", "Funcionário", "Status", "Data Entrega", "Data Retirada", "Retirado Por"];
        const row = formatDeliveryToCSVRow(delivery);
        const csvContent = [headers.join(';'), row].join('\n');
        triggerCSVDownload(csvContent, `entrega_${delivery.code}.csv`);
    };

    const handleSelectDelivery = (id: number, checked: boolean) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(filteredDeliveries.map(d => d.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const isAllSelected = useMemo(() => {
        if (filteredDeliveries.length === 0) return false;
        return filteredDeliveries.every(d => selectedIds.has(d.id));
    }, [filteredDeliveries, selectedIds]);

    const employeeOptions = employees.map(e => ({ value: String(e.id), label: e.name }));
    const residentOptions = residents.map(r => ({ value: String(r.id), label: `${r.name} - Bloco ${r.block} / Apto ${r.apt}` }));

    const stats = {
        total: filteredDeliveries.length,
        pending: filteredDeliveries.filter(d => d.status === 'pending').length,
        pickedUp: filteredDeliveries.filter(d => d.status === 'picked-up').length,
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <Calendar size={24} className="text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Relatório de Entregas</h1>
            </div>
            
            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total de Entregas (filtrado)" value={stats.total} icon={Package} iconColorClass="text-blue-500" />
                <StatCard title="Pendentes" value={stats.pending} icon={Clock} valueColorClass="text-orange-500" iconColorClass="text-orange-500" />
                <StatCard title="Concluídas" value={stats.pickedUp} icon={CheckCircle} valueColorClass="text-green-500" iconColorClass="text-green-500" />
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex-1 min-w-[300px] flex items-center gap-2">
                        <div className="relative flex-1">
                             <Search size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                id="search-delivery"
                                type="text"
                                placeholder="Buscar por código, morador ou funcionário..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full bg-white border border-gray-200 rounded-lg py-2.5 pl-11 pr-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="flex items-center justify-center gap-2 px-4 h-[42px] bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Search size={16} />
                            Buscar
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={clearFilters} className="flex items-center justify-center gap-2 px-4 h-[42px] bg-white border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                            <Filter size={16} />
                            Limpar
                        </button>
                        <button onClick={exportToCSV} className="flex items-center justify-center gap-2 px-4 h-[42px] bg-blue-600 text-white border border-blue-600 font-medium rounded-lg hover:bg-blue-700 transition-colors">
                            <Download size={16} />
                            Exportar
                        </button>
                         <button 
                            onClick={onDeleteSelected}
                            disabled={selectedIds.size === 0}
                            className="flex items-center justify-center gap-2 px-4 h-[42px] bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Trash2 size={16} />
                            Excluir ({selectedIds.size})
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SelectInput label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} placeholder="Todos os Status" options={[{value: 'pending', label: 'Pendente'}, {value: 'picked-up', label: 'Retirada'}]} />
                    <SelectInput label="Funcionário" value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} placeholder="Todos" options={employeeOptions} />
                    <SelectInput label="Morador" value={residentFilter} onChange={e => setResidentFilter(e.target.value)} placeholder="Todos" options={residentOptions} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <DateInput label="Data Início" selectedDate={startDate} onDateChange={setStartDate} />
                    <DateInput label="Data Fim" selectedDate={endDate} onDateChange={setEndDate} />
                </div>
                
                <div className="flex flex-wrap gap-2 pt-2">
                    {['Hoje', 'Ontem', 'Últimos 7 dias', 'Este mês'].map(filter => (
                        <button 
                            key={filter}
                            onClick={() => handleQuickDateFilter(filter)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                 <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <p className="text-sm text-gray-500 font-medium">Mostrando {filteredDeliveries.length} de {deliveries.length} entregas</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="p-4 w-4">
                                     <input
                                        type="checkbox"
                                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={isAllSelected}
                                        onChange={e => handleSelectAll(e.target.checked)}
                                        aria-label="Selecionar todas as entregas"
                                    />
                                </th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Código</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Morador</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Apto/Bloco</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Funcionário</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Entrega</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Retirada</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDeliveries.length > 0 ? (
                                filteredDeliveries.map(delivery => {
                                    const resident = residents.find(r => r.id === delivery.residentId);
                                    const employee = employees.find(e => e.id === delivery.employeeId);
                                    return (
                                        <tr key={delivery.id} className={`border-b border-gray-100 transition-colors ${selectedIds.has(delivery.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                            <td className="p-4">
                                                <input
                                                    type="checkbox"
                                                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    checked={selectedIds.has(delivery.id)}
                                                    onChange={e => handleSelectDelivery(delivery.id, e.target.checked)}
                                                    aria-label={`Selecionar entrega ${delivery.code}`}
                                                />
                                            </td>
                                            <td className="p-4 text-sm font-mono text-gray-700">{delivery.code}</td>
                                            <td className="p-4 text-sm font-medium text-gray-800">{resident?.name || 'N/A'}</td>
                                            <td className="p-4 text-sm text-gray-600">{`Apto ${resident?.apt} - Bloco ${resident?.block}`}</td>
                                            <td className="p-4 text-sm text-gray-600">{employee?.name || 'N/A'}</td>
                                            <td className="p-4 text-sm">
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${delivery.status === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                                                    {delivery.status === 'pending' ? 'Pendente' : 'Retirada'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-gray-600">{new Date(delivery.receivedDate).toLocaleDateString('pt-BR')}</td>
                                            <td className="p-4 text-sm text-gray-600">{delivery.pickupDate ? new Date(delivery.pickupDate).toLocaleDateString('pt-BR') : '—'}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => exportSingleDeliveryToCSV(delivery.id)}
                                                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                                                        aria-label="Exportar entrega"
                                                        title="Exportar"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteDelivery(delivery.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                        aria-label="Excluir entrega"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={9} className="text-center py-16 px-4">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <Package size={40} className="text-gray-300" />
                                            <h3 className="text-lg font-semibold text-gray-700">Nenhuma entrega encontrada</h3>
                                            <p className="text-sm text-gray-500">Tente ajustar os filtros aplicados para ver os resultados.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}