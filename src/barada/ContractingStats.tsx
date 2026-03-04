import React, { useState, useMemo } from 'react';
import {
  Building2, Banknote, Users, PieChart, BarChart2, TrendingUp, Filter,
  CheckCircle, MapPin, Calendar, Activity, Printer, Hash, Eye, Scissors,
  ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import DOMPurify from 'dompurify';

interface Booking {
  id: number;
  patientName: string;
  phone: string;
  doctorName: string;
  service: string;
  date: string;
  time: string;
  status: 'confirmed' | 'cancelled';
  bookingType?: 'cash' | 'contract';
  contractingCompanyId?: number;
  governorate?: string;
  center?: string;
  age?: number;
}

interface Operation {
  id: number;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  surgeryType: string;
  date: string;
  cost: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  contractingCompanyId?: number;
}

interface ContractingCompany {
  id: number;
  name: string;
}

interface ContractingStatsProps {
  bookings: Booking[];
  operations: Operation[];
  companies: ContractingCompany[];
  cardClass: string;
  settingsAppName: string;
}

// Age group definitions
const AGE_GROUPS = [
  { label: 'أقل من 10', min: 0, max: 9 },
  { label: '10–18', min: 10, max: 18 },
  { label: '19–30', min: 19, max: 30 },
  { label: '31–45', min: 31, max: 45 },
  { label: '46–60', min: 46, max: 60 },
  { label: 'أكبر من 60', min: 61, max: 200 },
];

const getAgeGroup = (age: number | undefined): string => {
  if (!age) return 'غير محدد';
  const group = AGE_GROUPS.find(g => age >= g.min && age <= g.max);
  return group?.label || 'غير محدد';
};

// Mini bar chart component
const MiniBar = ({ data, maxVal, color = 'bg-blue-500' }: { data: { label: string; value: number }[]; maxVal: number; color?: string }) => (
  <div className="flex items-end gap-1 h-24">
    {data.map((d, i) => (
      <div key={i} className="flex-1 flex flex-col items-center gap-1">
        <span className="text-[8px] text-gray-400 font-bold">{d.value}</span>
        <div
          className={`w-full ${color} rounded-t-md min-h-[2px] transition-all`}
          style={{ height: `${maxVal > 0 ? (d.value / maxVal) * 100 : 0}%` }}
        />
        <span className="text-[7px] text-gray-400 font-bold truncate w-full text-center">{d.label}</span>
      </div>
    ))}
  </div>
);

// Stat card component
const StatCard = ({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: any; color: string; sub?: string }) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      <span className="text-xs font-bold text-gray-400">{label}</span>
    </div>
    <h3 className="text-2xl font-black text-gray-900">{value}</h3>
    {sub && <p className="text-[10px] text-gray-400 font-bold mt-1">{sub}</p>}
  </div>
);

// Simple pie chart via CSS conic-gradient
const SimplePie = ({ segments }: { segments: { label: string; value: number; color: string }[] }) => {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) return <p className="text-gray-400 text-xs text-center py-4">لا توجد بيانات</p>;

  let accumulated = 0;
  const gradientParts: string[] = [];
  segments.forEach(s => {
    const pct = (s.value / total) * 100;
    gradientParts.push(`${s.color} ${accumulated}% ${accumulated + pct}%`);
    accumulated += pct;
  });

  return (
    <div className="flex items-center gap-6">
      <div
        className="w-28 h-28 rounded-full shrink-0"
        style={{ background: `conic-gradient(${gradientParts.join(', ')})` }}
      />
      <div className="space-y-2 flex-1">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="font-bold text-gray-600 flex-1">{s.label}</span>
            <span className="font-black text-gray-900">{s.value}</span>
            <span className="text-gray-400 font-bold">({total > 0 ? Math.round((s.value / total) * 100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ContractingStats: React.FC<ContractingStatsProps> = ({
  bookings, operations, companies, cardClass, settingsAppName
}) => {
  const [activeSection, setActiveSection] = useState<'contracting' | 'geographic' | 'age'>('contracting');
  const [dateFilter, setDateFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');

  // Get unique doctors
  const allDoctors = useMemo(() => {
    const set = new Set([...bookings.map(b => b.doctorName), ...operations.map(o => o.doctorName)]);
    return Array.from(set).filter(Boolean);
  }, [bookings, operations]);

  // Apply filters
  const filteredBookings = useMemo(() => {
    let result = bookings;
    if (dateFilter) result = result.filter(b => b.date?.startsWith(dateFilter));
    if (doctorFilter) result = result.filter(b => b.doctorName === doctorFilter);
    return result;
  }, [bookings, dateFilter, doctorFilter]);

  const filteredOperations = useMemo(() => {
    let result = operations;
    if (dateFilter) result = result.filter(o => o.date?.startsWith(dateFilter));
    if (doctorFilter) result = result.filter(o => o.doctorName === doctorFilter);
    return result;
  }, [operations, dateFilter, doctorFilter]);

  // ========= CONTRACTING STATS =========
  const contractingStats = useMemo(() => {
    const confirmedBookings = filteredBookings.filter(b => b.status === 'confirmed');
    const contractBookings = confirmedBookings.filter(b => b.bookingType === 'contract');
    const cashBookings = confirmedBookings.filter(b => b.bookingType !== 'contract');

    const confirmedOps = filteredOperations.filter(o => o.status === 'confirmed');
    const contractOps = confirmedOps.filter(o => o.contractingCompanyId);
    const cashOps = confirmedOps.filter(o => !o.contractingCompanyId);

    // Per company stats
    const companyStats = companies.map(company => {
      const compBookings = contractBookings.filter(b => b.contractingCompanyId === company.id);
      const compOps = contractOps.filter(o => o.contractingCompanyId === company.id);
      const compPatients = new Set([...compBookings.map(b => b.phone), ...compOps.map(o => o.patientPhone)]);

      return {
        id: company.id,
        name: company.name,
        patients: compPatients.size,
        bookings: compBookings.length,
        operations: compOps.length,
        totalCases: compBookings.length + compOps.length,
        bookingPercent: confirmedBookings.length > 0 ? Math.round((compBookings.length / confirmedBookings.length) * 100) : 0,
        opsPercent: confirmedOps.length > 0 ? Math.round((compOps.length / confirmedOps.length) * 100) : 0,
        totalPercent: (confirmedBookings.length + confirmedOps.length) > 0
          ? Math.round(((compBookings.length + compOps.length) / (confirmedBookings.length + confirmedOps.length)) * 100)
          : 0,
      };
    }).filter(c => c.totalCases > 0).sort((a, b) => b.totalCases - a.totalCases);

    // Monthly trend (last 6 months)
    const monthlyTrend: { month: string; contract: number; cash: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' });
      const monthContractBookings = contractBookings.filter(b => b.date?.startsWith(monthKey)).length;
      const monthCashBookings = cashBookings.filter(b => b.date?.startsWith(monthKey)).length;
      monthlyTrend.push({ month: monthLabel, contract: monthContractBookings, cash: monthCashBookings });
    }

    // Pie chart colors
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

    return {
      contractBookings: contractBookings.length,
      cashBookings: cashBookings.length,
      contractOps: contractOps.length,
      cashOps: cashOps.length,
      companyStats,
      monthlyTrend,
      bookingContractPercent: confirmedBookings.length > 0 ? Math.round((contractBookings.length / confirmedBookings.length) * 100) : 0,
      opsContractPercent: confirmedOps.length > 0 ? Math.round((contractOps.length / confirmedOps.length) * 100) : 0,
      pieSegments: companyStats.map((c, i) => ({ label: c.name, value: c.totalCases, color: COLORS[i % COLORS.length] })),
    };
  }, [filteredBookings, filteredOperations, companies]);

  // ========= GEOGRAPHIC STATS =========
  const geoStats = useMemo(() => {
    const confirmedBookings = filteredBookings.filter(b => b.status === 'confirmed');
    const confirmedOps = filteredOperations.filter(o => o.status === 'confirmed');

    // Governorate stats
    const govMap: Record<string, { bookings: number; cancelled: number; ops: number; patients: Set<string> }> = {};
    filteredBookings.forEach(b => {
      const gov = b.governorate || 'غير محدد';
      if (!govMap[gov]) govMap[gov] = { bookings: 0, cancelled: 0, ops: 0, patients: new Set() };
      if (b.status === 'confirmed') { govMap[gov].bookings++; govMap[gov].patients.add(b.phone); }
      else govMap[gov].cancelled++;
    });
    // Add operation stats per governorate (operations don't have governorate, but we can cross-reference via phone)
    const phoneToGov: Record<string, string> = {};
    filteredBookings.forEach(b => { if (b.governorate && b.phone) phoneToGov[b.phone] = b.governorate; });
    filteredOperations.forEach(o => {
      const gov = phoneToGov[o.patientPhone] || 'غير محدد';
      if (!govMap[gov]) govMap[gov] = { bookings: 0, cancelled: 0, ops: 0, patients: new Set() };
      if (o.status === 'confirmed') { govMap[gov].ops++; govMap[gov].patients.add(o.patientPhone); }
    });

    const govStats = Object.entries(govMap)
      .map(([name, data]) => ({
        name,
        bookings: data.bookings,
        cancelled: data.cancelled,
        ops: data.ops,
        patients: data.patients.size,
        total: data.bookings + data.ops,
        cancelRate: (data.bookings + data.cancelled) > 0 ? Math.round((data.cancelled / (data.bookings + data.cancelled)) * 100) : 0,
        opsRate: data.patients.size > 0 ? Math.round((data.ops / data.patients.size) * 100) : 0,
      }))
      .sort((a, b) => b.patients - a.patients);

    // Center stats
    const centerMap: Record<string, { count: number; patients: Set<string> }> = {};
    filteredBookings.filter(b => b.status === 'confirmed').forEach(b => {
      const c = b.center || 'غير محدد';
      if (!centerMap[c]) centerMap[c] = { count: 0, patients: new Set() };
      centerMap[c].count++;
      centerMap[c].patients.add(b.phone);
    });
    const centerStats = Object.entries(centerMap)
      .map(([name, data]) => ({ name, count: data.count, patients: data.patients.size }))
      .sort((a, b) => b.patients - a.patients)
      .slice(0, 10);

    return { govStats, centerStats };
  }, [filteredBookings, filteredOperations]);

  // ========= AGE STATS =========
  const ageStats = useMemo(() => {
    const confirmedBookings = filteredBookings.filter(b => b.status === 'confirmed');
    const cancelledBookings = filteredBookings.filter(b => b.status === 'cancelled');

    const ageGroupStats = AGE_GROUPS.map(group => {
      const groupConfirmed = confirmedBookings.filter(b => {
        const ag = getAgeGroup(b.age);
        return ag === group.label;
      });
      const groupCancelled = cancelledBookings.filter(b => {
        const ag = getAgeGroup(b.age);
        return ag === group.label;
      });
      const total = groupConfirmed.length + groupCancelled.length;

      return {
        label: group.label,
        confirmed: groupConfirmed.length,
        cancelled: groupCancelled.length,
        total,
        confirmRate: total > 0 ? Math.round((groupConfirmed.length / total) * 100) : 0,
        cancelRate: total > 0 ? Math.round((groupCancelled.length / total) * 100) : 0,
      };
    });

    // Operations by age (cross-reference with bookings for age data)
    const phoneToAge: Record<string, number> = {};
    filteredBookings.forEach(b => { if (b.age && b.phone) phoneToAge[b.phone] = b.age; });

    const opsAgeGroups = AGE_GROUPS.map(group => {
      const groupOps = filteredOperations.filter(o => {
        const age = phoneToAge[o.patientPhone];
        const ag = getAgeGroup(age);
        return ag === group.label;
      });
      const confirmedGroupOps = groupOps.filter(o => o.status === 'confirmed');
      const cancelledGroupOps = groupOps.filter(o => o.status === 'cancelled');

      // Surgery types in this age group
      const surgeryTypes: Record<string, number> = {};
      confirmedGroupOps.forEach(o => {
        surgeryTypes[o.surgeryType] = (surgeryTypes[o.surgeryType] || 0) + 1;
      });

      return {
        label: group.label,
        total: groupOps.length,
        confirmed: confirmedGroupOps.length,
        cancelled: cancelledGroupOps.length,
        cancelRate: groupOps.length > 0 ? Math.round((cancelledGroupOps.length / groupOps.length) * 100) : 0,
        topSurgeries: Object.entries(surgeryTypes).sort((a, b) => b[1] - a[1]).slice(0, 3),
      };
    });

    return { ageGroupStats, opsAgeGroups };
  }, [filteredBookings, filteredOperations]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const sanitizedAppName = DOMPurify.sanitize(settingsAppName);

    const content = `
      <h3>إحصائيات المرضى</h3>
      <table>
        <tr><td>كشوفات تعاقد</td><td>${contractingStats.contractBookings}</td></tr>
        <tr><td>كشوفات نقدي</td><td>${contractingStats.cashBookings}</td></tr>
        <tr><td>عمليات تعاقد</td><td>${contractingStats.contractOps}</td></tr>
        <tr><td>عمليات نقدي</td><td>${contractingStats.cashOps}</td></tr>
      </table>
      <h3>تفصيل الشركات</h3>
      <table>
        <thead><tr><th>الشركة</th><th>المرضى</th><th>الكشوفات</th><th>العمليات</th><th>% من الإجمالي</th></tr></thead>
        <tbody>${contractingStats.companyStats.map(c => `<tr><td>${DOMPurify.sanitize(c.name)}</td><td>${c.patients}</td><td>${c.bookings}</td><td>${c.operations}</td><td>${c.totalPercent}%</td></tr>`).join('')}</tbody>
      </table>
      <h3>إحصائيات المحافظات</h3>
      <table>
        <thead><tr><th>المحافظة</th><th>المرضى</th><th>الكشوفات</th><th>العمليات</th><th>نسبة الإلغاء</th></tr></thead>
        <tbody>${geoStats.govStats.map(g => `<tr><td>${DOMPurify.sanitize(g.name)}</td><td>${g.patients}</td><td>${g.bookings}</td><td>${g.ops}</td><td>${g.cancelRate}%</td></tr>`).join('')}</tbody>
      </table>
      <h3>إحصائيات الفئات العمرية - كشف</h3>
      <table>
        <thead><tr><th>الفئة</th><th>عدد الحالات</th><th>نسبة التأكيد</th><th>نسبة الإلغاء</th></tr></thead>
        <tbody>${ageStats.ageGroupStats.map(a => `<tr><td>${a.label}</td><td>${a.total}</td><td>${a.confirmRate}%</td><td>${a.cancelRate}%</td></tr>`).join('')}</tbody>
      </table>
    `;

    printWindow.document.write(`
      <html lang="ar" dir="rtl">
        <head>
          <title>إحصائيات التعاقدات - ${sanitizedAppName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            @page { margin: 10mm; size: A4; }
            body { font-family: 'Cairo', sans-serif; margin: 0; padding: 10mm; color: #333; font-size: 10pt; }
            .header { text-align: center; border-bottom: 2px solid #2563eb; margin-bottom: 15px; padding-bottom: 8px; }
            .header h1 { margin: 0; font-size: 16pt; color: #1e3a8a; }
            h3 { color: #1e3a8a; font-size: 12pt; margin: 15px 0 5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th, td { border: 1px solid #e2e8f0; padding: 4px 8px; text-align: right; font-size: 9pt; }
            th { background-color: #f8fafc; font-weight: bold; }
            .footer { margin-top: 20px; font-size: 8pt; text-align: center; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header"><h1>${sanitizedAppName}</h1><h2>إحصائيات التعاقدات والعنوان والسن</h2></div>
          ${DOMPurify.sanitize(content, { ALLOWED_TAGS: ['div', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'h3', 'h2'] })}
          <div class="footer">تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')} | ${sanitizedAppName}</div>
          <script>window.onload = function() { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const sections = [
    { id: 'contracting', label: 'التعاقدات', icon: Building2 },
    { id: 'geographic', label: 'العنوان', icon: MapPin },
    { id: 'age', label: 'الفئات العمرية', icon: Users },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Building2 size={28} className="text-blue-600" /> إحصائيات التعاقدات والعنوان والسن
          </h2>
          <p className="text-xs text-gray-400 font-bold mt-1">بيانات حقيقية مباشرة من قاعدة البيانات</p>
        </div>
        <button onClick={handlePrint} className="bg-gray-50 text-gray-600 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-gray-100 transition-all">
          <Printer size={14} /> طباعة / PDF
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500"><Filter size={14} /> فلتر:</div>
        <input
          type="month"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          placeholder="الشهر"
        />
        <select
          value={doctorFilter}
          onChange={e => setDoctorFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
        >
          <option value="">كل الأطباء</option>
          {allDoctors.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {(dateFilter || doctorFilter) && (
          <button onClick={() => { setDateFilter(''); setDoctorFilter(''); }} className="text-red-500 text-xs font-bold hover:underline">مسح الفلاتر</button>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSection === s.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-blue-50 hover:text-blue-600'
            }`}
          >
            <s.icon size={16} />
            {s.label}
          </button>
        ))}
      </div>

      {/* =================== CONTRACTING =================== */}
      {activeSection === 'contracting' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="كشوفات تعاقد" value={contractingStats.contractBookings} icon={Building2} color="bg-blue-100 text-blue-600" />
            <StatCard label="كشوفات نقدي" value={contractingStats.cashBookings} icon={Banknote} color="bg-green-100 text-green-600" />
            <StatCard label="عمليات تعاقد" value={contractingStats.contractOps} icon={Scissors} color="bg-purple-100 text-purple-600" />
            <StatCard label="عمليات نقدي" value={contractingStats.cashOps} icon={Banknote} color="bg-orange-100 text-orange-600" />
          </div>

          {/* Percentages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><PieChart size={16} className="text-blue-600" /> نسبة التعاقد مقابل النقدي (كشف)</h3>
              <div className="flex items-center gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-blue-600">تعاقد</span>
                    <span>{contractingStats.bookingContractPercent}%</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${contractingStats.bookingContractPercent}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-green-600">نقدي</span>
                    <span>{100 - contractingStats.bookingContractPercent}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><PieChart size={16} className="text-purple-600" /> نسبة التعاقد مقابل النقدي (عمليات)</h3>
              <div className="flex items-center gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-purple-600">تعاقد</span>
                    <span>{contractingStats.opsContractPercent}%</span>
                  </div>
                  <div className="bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${contractingStats.opsContractPercent}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-orange-600">نقدي</span>
                    <span>{100 - contractingStats.opsContractPercent}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pie chart - distribution */}
          {contractingStats.pieSegments.length > 0 && (
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><PieChart size={16} className="text-blue-600" /> التوزيع النسبي لجهات التعاقد</h3>
              <SimplePie segments={contractingStats.pieSegments} />
            </div>
          )}

          {/* Company table */}
          {contractingStats.companyStats.length > 0 && (
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><Building2 size={16} className="text-blue-600" /> تفاصيل كل جهة تعاقد</h3>
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs font-bold">
                      <th className="p-3 text-right">جهة التعاقد</th>
                      <th className="p-3 text-right">المرضى</th>
                      <th className="p-3 text-right">الكشوفات</th>
                      <th className="p-3 text-right">العمليات</th>
                      <th className="p-3 text-right">% كشوفات</th>
                      <th className="p-3 text-right">% عمليات</th>
                      <th className="p-3 text-right">% إجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractingStats.companyStats.map(c => (
                      <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="p-3 font-bold text-gray-900">{c.name}</td>
                        <td className="p-3 text-center"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-black">{c.patients}</span></td>
                        <td className="p-3 text-center font-bold">{c.bookings}</td>
                        <td className="p-3 text-center font-bold">{c.operations}</td>
                        <td className="p-3 text-center text-xs font-bold text-blue-600">{c.bookingPercent}%</td>
                        <td className="p-3 text-center text-xs font-bold text-purple-600">{c.opsPercent}%</td>
                        <td className="p-3 text-center"><span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-black">{c.totalPercent}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Monthly trend */}
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-blue-600" /> اتجاه شهري (تعاقد مقابل نقدي)</h3>
            <div className="flex items-end gap-2 h-32">
              {contractingStats.monthlyTrend.map((m, i) => {
                const maxVal = Math.max(...contractingStats.monthlyTrend.map(x => x.contract + x.cash), 1);
                const totalH = ((m.contract + m.cash) / maxVal) * 100;
                const contractH = m.contract + m.cash > 0 ? (m.contract / (m.contract + m.cash)) * totalH : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[8px] text-gray-400 font-bold">{m.contract + m.cash}</span>
                    <div className="w-full flex flex-col" style={{ height: `${totalH}%` }}>
                      <div className="bg-blue-500 rounded-t-sm flex-none" style={{ height: `${contractH}%`, minHeight: m.contract > 0 ? '2px' : '0' }} />
                      <div className="bg-green-400 flex-1 rounded-b-sm" style={{ minHeight: m.cash > 0 ? '2px' : '0' }} />
                    </div>
                    <span className="text-[7px] text-gray-400 font-bold truncate w-full text-center">{m.month}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 text-[10px] font-bold text-gray-400">
              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full" /> تعاقد</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-400 rounded-full" /> نقدي</span>
            </div>
          </div>
        </div>
      )}

      {/* =================== GEOGRAPHIC =================== */}
      {activeSection === 'geographic' && (
        <div className="space-y-6">
          {/* Governorate table */}
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><MapPin size={16} className="text-blue-600" /> إحصائيات المحافظات</h3>
            {geoStats.govStats.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-6 font-bold">لا توجد بيانات عنوان مسجلة</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs font-bold">
                      <th className="p-3 text-right">#</th>
                      <th className="p-3 text-right">المحافظة</th>
                      <th className="p-3 text-right">المرضى</th>
                      <th className="p-3 text-right">الكشوفات</th>
                      <th className="p-3 text-right">العمليات</th>
                      <th className="p-3 text-right">نسبة الإلغاء</th>
                      <th className="p-3 text-right">نسبة العمليات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {geoStats.govStats.map((g, i) => (
                      <tr key={g.name} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="p-3 text-xs font-black text-gray-400">{i + 1}</td>
                        <td className="p-3 font-bold text-gray-900">{g.name}</td>
                        <td className="p-3 text-center"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-black">{g.patients}</span></td>
                        <td className="p-3 text-center font-bold">{g.bookings}</td>
                        <td className="p-3 text-center font-bold">{g.ops}</td>
                        <td className="p-3 text-center"><span className={`text-xs font-black ${g.cancelRate > 20 ? 'text-red-600' : 'text-gray-500'}`}>{g.cancelRate}%</span></td>
                        <td className="p-3 text-center"><span className="text-xs font-black text-purple-600">{g.opsRate}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Top 10 Centers/Cities bar chart */}
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><BarChart2 size={16} className="text-blue-600" /> أعلى 10 مراكز في عدد المرضى</h3>
            {geoStats.centerStats.length === 0 ? (
              <p className="text-gray-400 text-xs text-center py-6 font-bold">لا توجد بيانات</p>
            ) : (
              <div className="space-y-2">
                {geoStats.centerStats.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-xs font-black text-gray-400 w-6">{i + 1}</span>
                    <span className="text-xs font-bold text-gray-700 w-24 truncate">{c.name}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full flex items-center justify-end px-2 transition-all"
                        style={{ width: `${geoStats.centerStats[0]?.patients ? (c.patients / geoStats.centerStats[0].patients) * 100 : 0}%` }}
                      >
                        <span className="text-[9px] text-white font-black">{c.patients}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Governorate visual bars */}
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><BarChart2 size={16} className="text-blue-600" /> توزيع المحافظات (رسم بياني)</h3>
            <MiniBar
              data={geoStats.govStats.slice(0, 10).map(g => ({ label: g.name, value: g.patients }))}
              maxVal={Math.max(...geoStats.govStats.map(g => g.patients), 1)}
            />
          </div>
        </div>
      )}

      {/* =================== AGE =================== */}
      {activeSection === 'age' && (
        <div className="space-y-6">
          {/* Bookings by age */}
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><Users size={16} className="text-blue-600" /> الكشوفات حسب الفئة العمرية</h3>
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs font-bold">
                    <th className="p-3 text-right">الفئة العمرية</th>
                    <th className="p-3 text-right">عدد الحالات</th>
                    <th className="p-3 text-right">نسبة التأكيد</th>
                    <th className="p-3 text-right">نسبة الإلغاء</th>
                  </tr>
                </thead>
                <tbody>
                  {ageStats.ageGroupStats.map(a => (
                    <tr key={a.label} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-900">{a.label}</td>
                      <td className="p-3 text-center"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-black">{a.total}</span></td>
                      <td className="p-3 text-center"><span className="text-xs font-black text-green-600">{a.confirmRate}%</span></td>
                      <td className="p-3 text-center"><span className={`text-xs font-black ${a.cancelRate > 20 ? 'text-red-600' : 'text-gray-500'}`}>{a.cancelRate}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Age bar chart */}
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><BarChart2 size={16} className="text-blue-600" /> توزيع الفئات العمرية (كشف)</h3>
            <MiniBar
              data={ageStats.ageGroupStats.map(a => ({ label: a.label, value: a.total }))}
              maxVal={Math.max(...ageStats.ageGroupStats.map(a => a.total), 1)}
            />
          </div>

          {/* Operations by age */}
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><Scissors size={16} className="text-purple-600" /> العمليات حسب الفئة العمرية</h3>
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs font-bold">
                    <th className="p-3 text-right">الفئة العمرية</th>
                    <th className="p-3 text-right">عدد العمليات</th>
                    <th className="p-3 text-right">نسبة الإلغاء</th>
                    <th className="p-3 text-right">أنواع العمليات الشائعة</th>
                  </tr>
                </thead>
                <tbody>
                  {ageStats.opsAgeGroups.map(a => (
                    <tr key={a.label} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="p-3 font-bold text-gray-900">{a.label}</td>
                      <td className="p-3 text-center"><span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-xs font-black">{a.total}</span></td>
                      <td className="p-3 text-center"><span className={`text-xs font-black ${a.cancelRate > 20 ? 'text-red-600' : 'text-gray-500'}`}>{a.cancelRate}%</span></td>
                      <td className="p-3 text-xs text-gray-600">
                        {a.topSurgeries.length > 0 
                          ? a.topSurgeries.map(([type, count]) => `${type} (${count})`).join('، ') 
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operations age bar chart */}
          <div className={cardClass}>
            <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><BarChart2 size={16} className="text-purple-600" /> توزيع الفئات العمرية (عمليات)</h3>
            <MiniBar
              data={ageStats.opsAgeGroups.map(a => ({ label: a.label, value: a.total }))}
              maxVal={Math.max(...ageStats.opsAgeGroups.map(a => a.total), 1)}
              color="bg-purple-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractingStats;
