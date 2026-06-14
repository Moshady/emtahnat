
// ==========================================
// CONFIGURATIONS & INITIAL STATES
// ==========================================

// Enter your Supabase credentials here:
const SUPABASE_URL = 'https://poqpieexdswhkrtjhirx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcXBpZWV4ZHN3aGtydGpoaXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjUxMzIsImV4cCI6MjA5Njg0MTEzMn0.zlMnwcVkthuxfBBEkfmJf9uh9NMmbneoathDs3IMJSs';

let supabaseClient = null;
let isDemoMode = false;

// Try initializing Supabase
if (SUPABASE_URL && SUPABASE_KEY) {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (err) {
        console.error("Failed to connect to Supabase: ", err);
    }
}

// Global State variables
let currentLanguage = 'ar';
let currentTheme = 'dark';
let countdownInterval = null;

// Active session variables
let loggedInStudent = null; // { id, name, code, phone }
let loggedInAdmin = null;   // { username, role, passHash }

// Booking Session variables
let selectedBus = null;
let selectedTripType = 'going'; // 'going', 'return', 'round_trip'
let selectedSeat = null;       // { id, label, type, price }
let selectedSeatLocked = false;
let seatSelectionRequestId = 0;
let activeLockTimer = null;
let activeLockTimeRemaining = 0; // seconds

// System Cache
let pricingCache = {
    going_price: 35.00,
    return_price: 35.00,
    round_trip_price: 60.00,
    vip_seat_fee: 10.00,
    front_seat_fee: 5.00,
    discount_amount: 0.00
};
let busesCache = [];
let studentsCache = [];
let reservationsCache = [];
let seatLocksCache = [];
let seatsCache = [];
let attendanceCache = [];
let activityLogsCache = [];
let realtimeSubscribed = false;
const STUDENT_SESSION_KEY = 'student_session';
const ADMIN_SESSION_KEY = 'admin_session';
const LAST_PAGE_KEY = 'ui_last_page';



// ------------------------------- lock-----------------
// ==========================================
// SITE LOCK — يحجب الموقع لغير الأدمن
// ==========================================
(function checkSiteLock() {
    const LOCK_ENABLED = true; // غيّرها لـ false لو عايز تفتح الموقع

    if (!LOCK_ENABLED) return;

    const adminSession = sessionStorage.getItem(ADMIN_SESSION_KEY) || localStorage.getItem(ADMIN_SESSION_KEY);
    const isAdmin = !!adminSession;

    if (!isAdmin) {
        const overlay = document.getElementById('site-lock-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            // إخفاء كل محتوى الصفحة خلف الـ overlay
            document.body.style.overflow = 'hidden';
        }
    }
})();


// Designer canvas parameters
let designerSeats = []; // { seat_label, seat_type, x_pos, y_pos, is_active }
let selectedDesignerSeatIndex = null;

// Localization Dictionary
const translations = {
    ar: {
        login: "تسجيل دخول  ",
        logout: "تسجيل خروج",
        demo_mode: "وضع التجربة النشط",
        hero_title: "رحلتك للامتحان بضغطة زر واحدة!",
        hero_desc: "احجز مقعدك في الحافلات المكيفة المخصصة لنقل الطلاب مباشرة من وإلى مقرات اللجان والامتحانات. احجز مبكراً لتضمن مكانك.",
        reserve_seat: "احجز مقعدك الآن",
        view_buses: "عرض الحافلات",
        countdown_title: "العد التنازلي لبداية لجنة الامتحان القادمة:",
        countdown_sub: "سارع بالحجز قبل اكتمال حمولة الباصات",
        days: "يوم",
        hours: "ساعة",
        minutes: "دقيقة",
        seconds: "ثانية",
        stat_students_label: "طالب مسجل بالمنظومة",
        stat_buses_label: "عربيه نشطة مجدولة",
        stat_trips_label: "مقعد محجوز ومؤكد",
        stat_satisfaction_label: "نسبة إشغال الحافلات",
        how_it_works: "كيف تعمل منصة الحجز؟",
        step1_title: "أدخل كود الطالب",
        step1_desc: "تحصل على كود الحجز الشخصي من إدارة الكلية أو المشرف المباشر لتسجيل الدخول.",
        step2_title: "اختر حافلتك ومقعدك",
        step2_desc: "اختر مسار العربيه المناسب لك ونوع الحجز ثم اختر المقعد المفضل لديك من خريطة Toyota Hiace.",
        step3_title: "احصل على التذكرة الذكية",
        step3_desc: "سيقوم النظام بإصدار تذكرتك الرقمية تحتوي على رمز الاستجابة السريعة QR لتأكيد الحضور.",
        available_buses: "عربياتنا المجدولة للا متحان",
        testimonials_title: "ماذا يقول الطلاب عن خدمتنا؟",
        stud_tag: "طالب بكلية الهندسة",
        stud_tag2: "طالبة بكلية الصيدلة",
        testi1: "\"بسبب الباصات لا أقلق بشأن المواصلات صباح الامتحان. المواعيد دقيقة والوصول مريح جداً.\"",
        testi2: "\"الحجز رائع وخريطة الباص تفاعلية جداً وتوفر خيار حجز حافلات مخصصة للطالبات فقط.\"",
        faqs_title: "الأسئلة الشائعة",
        faq1_q: "كيف أحصل على كود حجز الطالب؟",
        faq1_a: "يتم إنشاء الأكواد وتوزيعها بواسطة شؤون الطلاب أو إدارة النقل بالكلية. إذا لم يصلك كود، تواصل مع الدعم الفني.",
        faq2_q: "كم تبلغ مدة قفل المقعد المؤقت؟",
        faq2_a: "عند اختيارك لمقعد يتم قفله مؤقتاً باسمك لمدة 3 دقائق لإتاحة الوقت لإكمال عملية الحجز والدفع. إذا انتهى الوقت دون إتمام الحجز سيتم إلغاء القفل تلقائياً.",
        faq3_q: "هل يمكنني إلغاء الحجز أو تعديله؟",
        faq3_a: "نعم، يمكنك إلغاء الحجز من شاشة ملفك الشخصي قبل موعد الرحلة بأربعة وعشرين ساعة كحد أقصى.",
        auth_header: "بوابة تسجيل دخول الطلاب",
        auth_subheader: "الرجاء إدخال رمز الحجز الخاص بك لمتابعة اختيار مقعدك.",
        res_code_label: "رمز الحجز الشخصي (Reservation Code)",
        verify_code: "التحقق من الرمز ودخول",
        code_label: "الكود:",
        history_btn: "سجل حجوزاتي",
        logout_btn: "تسجيل الخروج",
        ind_step_1: "اختر الرحلة",
        ind_step_2: "نوع التذكرة",
        ind_step_3: "خريطة المقاعد",
        select_bus_head: "اختر الباص المتاح للامتحانات:",
        select_type_head: "حدد مسار ونوع الرحلة:",
        trip_going: "ذهاب فقط",
        trip_going_sub: "إلى لجنة الامتحانات",
        trip_return: "عودة فقط",
        trip_return_sub: "إلى نقاط التجمع بعد الامتحان",
        trip_round: "ذهاب وعودة",
        trip_round_sub: "شامل الاتجاهين (توفير إضافي)",
        back: "السابق",
        next: "المتابعة",
        select_seat_head: "خريطة مقاعد العربيه التفاعلية (تويوتا هايس)",
        select_seat_sub: "انقر على مقعد فارغ لحجزه مؤقتاً وإتمام الحجز",
        seat_locked_for: "تم قفل المقعد مؤقتاً باسمك! الوقت المتبقي:",
        front_cabin: "مقدمة العربيه",
        back_cabin: "مؤخرة العربيه",
        leg_avail: "متاح",
        leg_res: "محجوز",
        leg_sel: "محدد",
        leg_lock: "مغلق مؤقتاً",
        leg_vip: "VIP مميز",
        leg_front: "أمامي",
        leg_driver: "سائق",
        confirm_btn: "تأكيد حجز المقعد",
        history_head: "سجل الحجوزات الخاصة بك",
        h_date: "تاريخ الحجز",
        h_bus: "العربيه",
        h_seat: "رقم المقعد",
        h_type: "المسار",
        h_price: "السعر",
        h_status: "حالة الحجز",
        h_actions: "الإجراءات",
        ticket_header: "تذكرة ركوب عربيه الامتحانات",
        ticket_subheader: "الرجاء إظهار كود الـ QR للمشرف قبل الصعود للعربيه",
        t_stud_name: "اسم الطالب",
        t_res_code: "رمز الحجز",
        t_bus_name: "اسم العربيه",
        t_seat_num: "رقم المقعد",
        t_driver: "السائق",
        t_time: "وقت التحرك",
        t_loc: "مكان التجمع",
        t_price: "نوع الحجز والسعر",
        t_verify_text: "النظام مشفر. يتم مسح الكود من المشرف لتأكيد الحضور.",
        t_pdf: "تحميل PDF",
        t_print: "طباعة التذكرة",
        t_back_portal: "العودة للبوابة",
        admin_login_head: "لوحة تحكم المسؤولين",
        admin_login_sub: "يرجى تسجيل الدخول للوصول إلى لوحة التحكم المتقدمة",
        admin_user: "اسم المستخدم",
        admin_pass: "كلمة المرور",
        admin_login_btn: "تسجيل دخول كمسؤول",
        ad_overview: "نظرة عامة",
        ad_students: "إدارة الطلاب",
        ad_buses: "إدارة الحافلات",
        ad_designer: "مصمم الباصات",
        ad_pricing: "إدارة الأسعار",
        ad_scan: "مسح كود الحضور",
        ad_logs: "مراقبة النظام",
        overview_head: "تقرير إحصائيات النظام الفورية",
        m_students: "إجمالي الطلاب المسجلين",
        m_reservations: "الحجوزات النشطة",
        m_occupancy: "نسبة إشغال المقاعد",
        m_revenue: "إجمالي الإيرادات المتوقعة",
        chart_trends: "منحنى الحجوزات اليومي والأسبوعي",
        chart_occupancy: "إشغال حافلات الامتحانات",
        student_crm_head: "قاعدة بيانات وإدارة كود الطلاب",
        add_student: "إضافة طالب",
        import_csv: "استيراد CSV",
        export_csv: "تصدير CSV",
        showing_records: "إجمالي السجلات:",
        crm_name: "الاسم بالكامل",
        crm_code: "رمز الحجز",
        crm_phone: "رقم الهاتف",
        crm_date: "تاريخ الإضافة",
        crm_notes: "ملاحظات",
        crm_actions: "الإجراءات",
        bus_crm_head: "إدارة حافلات الامتحانات",
        add_bus: "إضافة عربيه جديدة",
        bc_name: "اسم العربيه / النوع",
        bc_driver: "اسم السائق",
        bc_phone: "هاتف السائق",
        bc_time: "وقت التحرك",
        bc_loc: "نقطة التجمع",
        bc_capacity: "الحمولة",
        bc_template: "قالب المقاعد",
        bc_actions: "الإجراءات",
        designer_head: "مصمم وتعديل هيكل خريطة المقاعد التفاعلي",
        designer_sub: "حدد العربيه، صمم موضع المقاعد بسحبها، حدد المناطق الخاصة والممرات ثم احفظ القالب مباشرة.",
        des_select_bus: "اختر العربيه المراد تعديلها:",
        des_seat_type: "نوع المقعد المراد إضافته:",
        des_add_btn: "إضافة مقعد جديد",
        des_instructions: "انقر واسحب المقاعد داخل الشبكة لتعديل إحداثياتها، أو انقر على زر (x) لحذف المقعد.",
        des_save_btn: "حفظ قالب المقاعد",
        pricing_head: "لوحة التحكم في أسعار الرحلات والإضافات",
        pricing_save_btn: "تحديث وحفظ الأسعار فوراً",
        scanner_head: "مسح كود التذكرة QR والتحقق من الحضور",
        scan_time: "وقت تسجيل الحضور",
        logs_head: "سجل المراقبة الحية للعمليات (Activity Logs)",
        modal_conf_title: "تأكيد حجز التذكرة",
        modal_conf_desc: "يرجى مراجعة تفاصيل حجزك قبل التأكيد النهائي للمقعد:",
        total_price_label: "التكلفة الإجمالية:",
        modal_conf_confirm: "تأكيد وحفظ التذكرة",
        modal_conf_cancel: "إلغاء وتراجع",
        theme_palette: "اختر اللون المميز:",
        save: "حفظ البيانات"
    },
    en: {
        login: "Student Login",
        logout: "Logout",
        demo_mode: "Demo Mode Active",
        hero_title: "Your Exam Trip is One Click Away!",
        hero_desc: "Reserve your seat in air-conditioned buses dedicated to transporting students directly to and from examination committees. Book early to guarantee your place.",
        reserve_seat: "Book Your Seat Now",
        view_buses: "View Buses",
        countdown_title: "Countdown to Next Exam Committee:",
        countdown_sub: "Book before buses are fully occupied",
        days: "Days",
        hours: "Hours",
        minutes: "Min",
        seconds: "Sec",
        stat_students_label: "Registered Students",
        stat_buses_label: "Active Scheduled Buses",
        stat_trips_label: "Confirmed Bookings",
        stat_satisfaction_label: "Seats Occupancy Rate",
        how_it_works: "How Booking Works?",
        step1_title: "Enter Student Code",
        step1_desc: "Get your personal booking code from the college administration or supervisor to log in.",
        step2_title: "Choose Bus & Seat",
        step2_desc: "Select the appropriate bus route and booking type, then pick your preferred seat on the Toyota Hiace map.",
        step3_title: "Get Smart Ticket",
        step3_desc: "The system will instantly issue your digital ticket containing a secure QR code for attendance confirmation.",
        available_buses: "Our Scheduled Exam Buses",
        testimonials_title: "What Students Say?",
        stud_tag: "Engineering Student",
        stud_tag2: "Pharmacy Student",
        testi1: "\"Thanks to these buses, I don't worry about transport on exam mornings. Arrival times are highly accurate and comfortable.\"",
        testi2: "\"The booking system is excellent! The seat layout is highly interactive, and it offers student-only bus options.\"",
        faqs_title: "Frequently Asked Questions",
        faq1_q: "How do I get my student reservation code?",
        faq1_a: "Codes are generated and distributed by student affairs or college transportation. If you haven't received one, contact support.",
        faq2_q: "How long is the temporary seat lock?",
        faq2_a: "When you click a seat, it is locked under your name for 3 minutes to allow you to complete checkout. If the timer expires, the lock is automatically released.",
        faq3_q: "Can I cancel or edit my booking?",
        faq3_a: "Yes, you can cancel your booking from your profile page up to 24 hours before the departure time.",
        auth_header: "Student Portal Login",
        auth_subheader: "Please enter your reservation code to continue to seat selection.",
        res_code_label: "Personal Reservation Code",
        verify_code: "Verify Code & Enter",
        code_label: "Code:",
        history_btn: "My Booking History",
        logout_btn: "Logout",
        ind_step_1: "Select Trip",
        ind_step_2: "Ticket Type",
        ind_step_3: "Seat Map",
        select_bus_head: "Select Available Exam Bus:",
        select_type_head: "Select Route & Booking Type:",
        trip_going: "Going Only",
        trip_going_sub: "To exam committee",
        trip_return: "Return Only",
        trip_return_sub: "Back to assembly points",
        trip_round: "Round Trip",
        trip_round_sub: "Going & Return (Extra Savings)",
        back: "Back",
        next: "Next",
        select_seat_head: "Interactive Bus Seating Layout (Toyota Hiace)",
        select_seat_sub: "Click on an empty seat to lock and finalize your reservation",
        seat_locked_for: "Seat is temporarily locked! Time remaining:",
        front_cabin: "Front of Bus",
        back_cabin: "Back of Bus",
        leg_avail: "Available",
        leg_res: "Reserved",
        leg_sel: "Selected",
        leg_lock: "Locked",
        leg_vip: "VIP Zone",
        leg_front: "Front Seat",
        leg_driver: "Driver",
        confirm_btn: "Confirm Selected Seat",
        history_head: "Your Booking History",
        h_date: "Booking Date",
        h_bus: "Bus",
        h_seat: "Seat No",
        h_type: "Route",
        h_price: "Price",
        h_status: "Status",
        h_actions: "Actions",
        ticket_header: "Exam Transit Digital Ticket",
        ticket_subheader: "Show this QR code to the driver/supervisor upon boarding",
        t_stud_name: "Student Name",
        t_res_code: "Res Code",
        t_bus_name: "Bus Name",
        t_seat_num: "Seat No",
        t_driver: "Driver Name",
        t_time: "Departure",
        t_loc: "Meeting Point",
        t_price: "Type & Price",
        t_verify_text: "Encrypted system. Scanned by supervisor to mark attendance.",
        t_pdf: "Download PDF",
        t_print: "Print Ticket",
        t_back_portal: "Back to Portal",
        admin_login_head: "Admin Dashboard Portal",
        admin_login_sub: "Sign in with administrative credentials to access layout designer and CRM controls.",
        admin_user: "Username",
        admin_pass: "Password",
        admin_login_btn: "Log In as Administrator",
        ad_overview: "Overview",
        ad_students: "Students CRM",
        ad_buses: "Buses CRM",
        ad_designer: "Visual Designer",
        ad_pricing: "Pricing Panel",
        ad_scan: "QR Check-in",
        ad_logs: "System Logs",
        overview_head: "Real-time Operations Dashboard",
        m_students: "Total Students Registered",
        m_reservations: "Active Bookings",
        m_occupancy: "Seats Occupancy Rate",
        m_revenue: "Gross Revenue Forecast",
        chart_trends: "Daily Booking Trends",
        chart_occupancy: "Buses Occupancy Metrics",
        student_crm_head: "Student Access Database CRM",
        add_student: "Add Student Record",
        import_csv: "Import CSV Data",
        export_csv: "Export CSV Data",
        showing_records: "Total Records:",
        crm_name: "Full Name",
        crm_code: "Res Code",
        crm_phone: "Phone Number",
        crm_date: "Created Date",
        crm_notes: "Admin Notes",
        crm_actions: "Actions",
        bus_crm_head: "Scheduled Fleet Management CRM",
        add_bus: "Create Bus Record",
        bc_name: "Bus Name / Fleet Name",
        bc_driver: "Driver Name",
        bc_phone: "Driver Phone",
        bc_time: "Departure Time",
        bc_loc: "Meeting Spot",
        bc_capacity: "Capacity",
        bc_template: "Layout Template",
        bc_actions: "Actions",
        designer_head: "Interactive Bus Grid Seat Designer",
        designer_sub: "Pick a bus fleet, drag/drop seats to set alignment, select VIP/front seats, and commit templates.",
        des_select_bus: "Select Bus to Design Layout:",
        des_seat_type: "New Seat Configuration Type:",
        des_add_btn: "Insert New Seat Node",
        des_instructions: "Drag and align seat nodes within the layout grid. Click (x) to remove.",
        des_save_btn: "Commit Layout Grid",
        pricing_head: "Global Trip Pricing Configurations",
        pricing_save_btn: "Update and Apply Pricing",
        scanner_head: "QR Ticket Scan & Check-in Desk",
        scan_time: "Check-in Timestamp",
        logs_head: "Live Audit Trail Monitoring Terminal",
        modal_conf_title: "Confirm Ticket Booking",
        modal_conf_desc: "Review your selected itinerary and fee breakdown:",
        total_price_label: "Total Due Price:",
        modal_conf_confirm: "Book Seat & Generate Ticket",
        modal_conf_cancel: "Go Back",
        theme_palette: "Accent Color:",
        save: "Commit Data"
    }
};

// Initialize App on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    initializeDemoDatabase();
    localizePage();
    startExamCountdown();
    loadBusesToLanding();

    // Check routing hashes
    window.addEventListener('hashchange', handleHashRouting);
    const restoredStudent = restoreStudentSession();
    if (restoredStudent) {
        loggedInStudent = restoredStudent;
    }
    const restoredAdmin = restoreAdminSession();
    if (restoredAdmin) {
        loggedInAdmin = restoredAdmin;
    }

    const lastPage = restoreLastPage();
    if (lastPage && document.getElementById(lastPage)) {
        if (loggedInStudent || (lastPage !== 'student-portal-page' && lastPage !== 'ticket-page')) {
            navigateToPage(lastPage);
            if (lastPage === 'student-portal-page') {
                loadStudentPortalData();
            } else if (lastPage === 'ticket-page') {
                const cachedTicket = restoreOfflineTicket();
                if (cachedTicket?.reservation) {
                    setTimeout(() => viewDigitalTicket(cachedTicket.reservation), 0);
                }
            }
        } else {
            navigateToPage('student-portal-page');
            loadStudentPortalData();
        }
    } else {
        handleHashRouting();
    }

    // Setup FAQ accordion handlers
    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => {
            const item = q.parentElement;
            item.classList.toggle('active');
        });
    });

    // Lucide icon rendering
    lucide.createIcons();

    // PWA offline detection listeners
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();
});

// ==========================================
// LOCALIZATION & ROUTING UTILITIES
// ==========================================

function toggleLanguage() {
    currentLanguage = (currentLanguage === 'ar') ? 'en' : 'ar';
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = (currentLanguage === 'ar') ? 'rtl' : 'ltr';

    if (currentLanguage === 'en') {
        document.body.classList.add('lang-en');
        document.getElementById('lang-toggle').innerText = 'AR';
    } else {
        document.body.classList.remove('lang-en');
        document.getElementById('lang-toggle').innerText = 'EN';
    }

    localizePage();

    // Refresh components if rendering
    if (selectedBus) {
        renderSeatingMap(selectedBus.id);
    }
}

function localizePage() {
    const elms = document.querySelectorAll('[data-localize]');
    elms.forEach(el => {
        const key = el.getAttribute('data-localize');
        if (translations[currentLanguage][key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations[currentLanguage][key];
            } else {
                el.innerHTML = translations[currentLanguage][key];
            }
        }
    });

    // Special adjustments
    document.title = (currentLanguage === 'ar') ? "السوبر للمواصلات" : "Super Transport";
    document.getElementById('nav-title').innerText = (currentLanguage === 'ar') ? "السوبر للمواصلات" : "Super Transport";
}

function toggleTheme() {
    currentTheme = (currentTheme === 'dark') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    const icon = document.querySelector('#theme-toggle i');
    if (currentTheme === 'light') {
        icon.setAttribute('data-lucide', 'moon');
    } else {
        icon.setAttribute('data-lucide', 'sun');
    }
    lucide.createIcons();
    document.getElementById('confirm-booking-btn').disabled = !(selectedSeat && selectedSeatLocked);
}

function toggleThemePanel() {
    document.getElementById('theme-panel').classList.toggle('active');
}

function normalizeReservationRow(row, seatLookup = new Map()) {
    return {
        ...row,
        booking_date: row.booking_date || row.created_at || new Date().toISOString(),
        status: row.status || 'confirmed',
        seat_label: row.seat_label || seatLookup.get(row.seat_id) || ''
    };
}

function normalizeLockRow(row, seatLookup = new Map()) {
    return {
        ...row,
        locked_until: row.locked_until || row.created_at || new Date().toISOString(),
        seat_label: row.seat_label || seatLookup.get(row.seat_id) || ''
    };
}

function normalizeActivityLogRow(row) {
    return {
        ...row,
        time: row.time || row.created_at || new Date().toISOString()
    };
}

function persistStudentSession(student) {
    if (!student) return;
    localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(student));
}

function clearStudentSession() {
    localStorage.removeItem(STUDENT_SESSION_KEY);
    localStorage.removeItem(LAST_PAGE_KEY);
    localStorage.removeItem('offline_ticket_cache');
}

function restoreStudentSession() {
    try {
        const raw = localStorage.getItem(STUDENT_SESSION_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (session && session.id && session.reservation_code) {
            return session;
        }
    } catch (err) {
        console.warn("Failed to restore student session:", err);
    }
    return null;
}

function persistAdminSession(admin) {
    if (!admin) return;
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(admin));
}

function clearAdminSession() {
    localStorage.removeItem(ADMIN_SESSION_KEY);
}

function restoreAdminSession() {
    try {
        const raw = localStorage.getItem(ADMIN_SESSION_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (session && session.username && session.passHash) {
            return session;
        }
    } catch (err) {
        console.warn("Failed to restore admin session:", err);
    }
    return null;
}

function restoreLastPage() {
    return localStorage.getItem(LAST_PAGE_KEY) || '';
}

function restoreOfflineTicket() {
    try {
        const raw = localStorage.getItem('offline_ticket_cache');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (err) {
        console.warn("Failed to restore ticket cache:", err);
        return null;
    }
}

function renderTicketReservation(reservation) {
    if (!reservation || !loggedInStudent) return;

    const student = loggedInStudent;
    const bus = busesCache.find(b => b.id === reservation.bus_id) || selectedBus;

    document.getElementById('t-student-name').innerText = student.full_name;
    document.getElementById('t-res-code').innerText = student.reservation_code;
    document.getElementById('t-bus-name').innerText = bus ? bus.name : '-';
    document.getElementById('t-seat-num').innerText = reservation.seat_label || '-';
    document.getElementById('t-driver-name').innerText = bus ? bus.driver_name : '-';
    document.getElementById('t-departure-time').innerText = bus ? bus.departure_time : '-';
    document.getElementById('t-meeting-location').innerText = bus ? bus.meeting_location : '-';

    let tripLabel = (reservation.reservation_type === 'going') ? 'ذهاب فقط' : ((reservation.reservation_type === 'return') ? 'عودة فقط' : 'ذهاب وعودة');
    if (currentLanguage === 'en') {
        tripLabel = reservation.reservation_type.toUpperCase().replace('_', ' ');
    }

    document.getElementById('t-type').innerText = tripLabel;
    document.getElementById('t-price').innerText = `${reservation.price} EGP`;

    const qrCanvas = document.getElementById('ticket-qr-code');
    if (qrCanvas) {
        new QRious({
            element: qrCanvas,
            value: reservation.id,
            size: 200,
            foreground: '#0f172a'
        });
    }

    localStorage.setItem('offline_ticket_cache', JSON.stringify({
        reservation,
        student,
        bus
    }));
}

async function hashPasswordSHA256(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

function setThemeAccent(colorHex, el) {
    document.documentElement.style.setProperty('--accent', colorHex);

    // Simple convert hex to rgb for opacity variables
    let r = parseInt(colorHex.slice(1, 3), 16);
    let g = parseInt(colorHex.slice(3, 5), 16);
    let b = parseInt(colorHex.slice(5, 7), 16);
    document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);

    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
}

function handleHashRouting() {
    const hash = window.location.hash;
    const isAdminPage = window.location.pathname.includes('admin.html');

    if (hash === '#admin' || (isAdminPage && hash === '')) {
        if (loggedInAdmin) {
            navigateToPage('admin-dashboard-page');
        } else {
            navigateToPage('admin-login-page');
        }
    } else if (hash === '#student') {
        if (loggedInStudent) {
            navigateToPage('student-portal-page');
        } else {
            navigateToPage('auth-page');
        }
    } else if (hash === '#home' || (!isAdminPage && hash === '')) {
        navigateToPage('landing-page');
    }
}

function navigateToPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
        localStorage.setItem(LAST_PAGE_KEY, pageId);
    } else {
        // Handle cross-page navigation
        if (pageId === 'admin-dashboard-page' || pageId === 'admin-login-page') {
            window.location.href = 'admin.html#' + (pageId === 'admin-dashboard-page' ? 'admin' : '');
            return;
        } else {
            window.location.href = 'index.html#' + (pageId === 'student-portal-page' ? 'student' : '');
            return;
        }
    }

    // Adjust header button state
    const headerBtn = document.getElementById('header-auth-btn');
    if (loggedInStudent) {
        headerBtn.innerHTML = `<i data-lucide="user"></i> <span>${loggedInStudent.full_name.split(' ')[0]}</span>`;
        headerBtn.setAttribute('onclick', 'navigateToPage("student-portal-page")');
    } else if (loggedInAdmin) {
        headerBtn.innerHTML = `<i data-lucide="shield"></i> <span>التحكم / Dashboard</span>`;
        headerBtn.setAttribute('onclick', 'navigateToPage("admin-dashboard-page")');
    } else {
        headerBtn.innerHTML = `<i data-lucide="log-in"></i> <span>${translations[currentLanguage]['login']}</span>`;
        headerBtn.setAttribute('onclick', 'navigateToPage("auth-page")');
    }

    // Load admin data if viewing admin panel
    if (pageId === 'admin-dashboard-page') {
        loadAdminOverviewMetrics();
        loadAdminStudentsCRM();
        loadAdminReservations();
        loadAdminBusesCRM();
        loadDesignerBusesSelect();
        loadAdminPricingForm();
    } else if (pageId === 'student-portal-page' && loggedInStudent) {
        loadStudentPortalData();
    } else if (pageId === 'ticket-page') {
        const cachedTicket = restoreOfflineTicket();
        if (cachedTicket?.reservation) {
            // Rehydrate the ticket DOM when restoring after refresh.
            renderTicketReservation(cachedTicket.reservation);
        }
    }

    lucide.createIcons();
}

function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
    }
}

function handleHeaderAuthAction() {
    if (loggedInStudent) {
        navigateToPage('student-portal-page');
    } else if (loggedInAdmin) {
        navigateToPage('admin-dashboard-page');
    } else {
        navigateToPage('auth-page');
    }
}

function updateNetworkStatus() {
    const bar = document.getElementById('offline-bar');
    if (navigator.onLine) {
        bar.style.display = 'none';
    } else {
        bar.style.display = 'block';
        showToast("error", "⚠️ تم انقطاع اتصالك بالإنترنت. يمكنك تصفح التذاكر المحفوظة محلياً فقط.");
    }
}

// ==========================================
// NOTIFICATIONS (TOASTS)
// ==========================================

function showToast(type, message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast glass-card ${type}`;

    let iconName = 'info';
    if (type === 'success') iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';
    if (type === 'warning') iconName = 'alert-circle';

    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <div>${message}</div>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.style.animation = 'none';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================
// EXAM DATE COUNTDOWN
// ==========================================
function startExamCountdown() {
    // Check if countdown target exists in demo settings or default
    let targetDateStr = "2026-06-25T09:00:00";

    // Retrieve from demo settings if available
    if (localStorage.getItem('exam_countdown')) {
        try {
            const saved = JSON.parse(localStorage.getItem('exam_countdown'));
            targetDateStr = saved.date;

            const titleText = (currentLanguage === 'ar') ? saved.title_ar : saved.title_en;
            document.getElementById('countdown-title').innerText = titleText;
        } catch (e) { }
    }

    const targetDate = new Date(targetDateStr).getTime();

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const diff = targetDate - now;

        if (diff < 0) {
            clearInterval(countdownInterval);
            document.getElementById('cd-days').innerText = "00";
            document.getElementById('cd-hours').innerText = "00";
            document.getElementById('cd-mins').innerText = "00";
            document.getElementById('cd-secs').innerText = "00";
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const cdDaysEl = document.getElementById('cd-days');
        if (cdDaysEl) {
            cdDaysEl.innerText = String(days).padStart(2, '0');
            document.getElementById('cd-hours').innerText = String(hours).padStart(2, '0');
            document.getElementById('cd-mins').innerText = String(minutes).padStart(2, '0');
            document.getElementById('cd-secs').innerText = String(seconds).padStart(2, '0');
        }
    }, 1000);
}

async function saveCountdownSettings() {
    const busId = document.getElementById('admin-countdown-bus').value;
    const dateVal = document.getElementById('admin-countdown-date').value;
    if (!busId || !dateVal) {
        showToast("الرجاء اختيار العربية وتحديد التاريخ", "error");
        return;
    }
    const bus = busesCache.find(b => b.id === busId);
    if (!bus) return;

    const targetDateStr = `${dateVal}T${bus.departure_time}`;
    const titleText = `العد التنازلي لتحرك عربية: ${bus.name}`;

    const countdownData = {
        busId: bus.id,
        date: targetDateStr,
        title_ar: titleText,
        title_en: titleText
    };

    try {
        const { error } = await supabaseClient
            .from('settings')
            .upsert(
                { setting_key: 'exam_countdown', setting_value: countdownData },
                { onConflict: 'setting_key' }
            );

        if (error) throw error;

        localStorage.setItem('exam_countdown', JSON.stringify(countdownData));
        showToast("تم تحديث إعدادات العد التنازلي بنجاح", "success");

        startExamCountdown();
    } catch (err) {
        showToast("حدث خطأ: " + (err.message || err), "error");
        console.error(err);
    }
}

function populateAdminCountdownBuses() {
    const sel = document.getElementById('admin-countdown-bus');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- اختر العربية --</option>';
    busesCache.forEach(b => {
        sel.innerHTML += `<option value="${b.id}">${b.name} (${b.departure_time})</option>`;
    });
}

// ==========================================
// DATABASE SEED & DEMO SIMULATION LAYER
// ==========================================
// This ensures the application runs perfectly out of the box. 
// If Supabase credentials are input, it queries Supabase.

function initializeDemoDatabase() {
    if (isDemoMode) {
        document.getElementById('demo-indicator').style.display = 'block';
        console.log("System running in Enterprise Demo Mode (Local Storage DB)");

        // Initialize Local Storage mock tables
        if (!localStorage.getItem('pricing')) {
            localStorage.setItem('pricing', JSON.stringify(pricingCache));
        } else {
            pricingCache = JSON.parse(localStorage.getItem('pricing'));
        }

        if (!localStorage.getItem('buses')) {
            const defaultBuses = [
                { id: 'b-1', name: 'Microbus 1 (Toyota Hiace)', driver_name: 'عم محمد السواق', driver_phone: '+201012345678', departure_time: '07:30', meeting_location: 'ميدان التحرير - أمام المتحف المصري', capacity: 14, layout_template: 'toyota_14', notes: 'مكيفة بالكامل' },
                { id: 'b-2', name: 'VIP Bus (Air Conditioned)', driver_name: 'كابتن هاني شريف', driver_phone: '+201122334455', departure_time: '08:00', meeting_location: 'بوابة الجامعة الرئيسية', capacity: 17, layout_template: 'toyota_17', notes: 'أتوبيس فاخر وسريع للطالبات' },
                { id: 'b-3', name: 'Girls Microbus', driver_name: 'عم جابر التونسي', driver_phone: '+201288998877', departure_time: '07:30', meeting_location: 'محطة مترو جامعة القاهرة', capacity: 14, layout_template: 'toyota_14', notes: 'مخصص للطالبات فقط' }
            ];
            localStorage.setItem('buses', JSON.stringify(defaultBuses));
            busesCache = defaultBuses;
        } else {
            busesCache = JSON.parse(localStorage.getItem('buses'));
        }

        if (!localStorage.getItem('students')) {
            const defaultStudents = [
                { id: 's-1', full_name: 'احمد محمد علي', reservation_code: 'STUD-1001', phone_number: '+201011111111', notes: 'مستوى اول' },
                { id: 's-2', full_name: 'سارة محمود احمد', reservation_code: 'STUD-1002', phone_number: '+201022222222', notes: 'مستوى ثاني صيدلة' },
                { id: 's-3', full_name: 'يوسف كريم حسن', reservation_code: 'STUD-1003', phone_number: '+201033333333', notes: '' },
                { id: 's-4', full_name: 'نور الهدى مصطفى', reservation_code: 'STUD-1004', phone_number: '+201044444444', notes: '' }
            ];
            localStorage.setItem('students', JSON.stringify(defaultStudents));
            studentsCache = defaultStudents;
        } else {
            studentsCache = JSON.parse(localStorage.getItem('students'));
        }

        // Load seats
        if (!localStorage.getItem('seats')) {
            let defaultSeats = [];
            // Generate 14 seats for b-1 & b-3
            ['b-1', 'b-3'].forEach(busId => {
                defaultSeats.push({ bus_id: busId, seat_label: 'Driver', seat_type: 'driver', x_pos: 0, y_pos: 0, is_active: true });
                defaultSeats.push({ bus_id: busId, seat_label: '1', seat_type: 'front', x_pos: 2, y_pos: 0, is_active: true });

                defaultSeats.push({ bus_id: busId, seat_label: '2', seat_type: 'standard', x_pos: 0, y_pos: 1, is_active: true });
                defaultSeats.push({ bus_id: busId, seat_label: '3', seat_type: 'standard', x_pos: 2, y_pos: 1, is_active: true });

                defaultSeats.push({ bus_id: busId, seat_label: '4', seat_type: 'standard', x_pos: 0, y_pos: 2, is_active: true });
                defaultSeats.push({ bus_id: busId, seat_label: '5', seat_type: 'standard', x_pos: 2, y_pos: 2, is_active: true });

                defaultSeats.push({ bus_id: busId, seat_label: '6', seat_type: 'standard', x_pos: 0, y_pos: 3, is_active: true });
                defaultSeats.push({ bus_id: busId, seat_label: '7', seat_type: 'standard', x_pos: 2, y_pos: 3, is_active: true });

                defaultSeats.push({ bus_id: busId, seat_label: '8', seat_type: 'standard', x_pos: 0, y_pos: 4, is_active: true });
                defaultSeats.push({ bus_id: busId, seat_label: '9', seat_type: 'standard', x_pos: 2, y_pos: 4, is_active: true });

                defaultSeats.push({ bus_id: busId, seat_label: '10', seat_type: 'standard', x_pos: 0, y_pos: 5, is_active: true });
                defaultSeats.push({ bus_id: busId, seat_label: '11', seat_type: 'standard', x_pos: 1, y_pos: 5, is_active: true });
                defaultSeats.push({ bus_id: busId, seat_label: '12', seat_type: 'standard', x_pos: 2, y_pos: 5, is_active: true });
                defaultSeats.push({ bus_id: busId, seat_label: '13', seat_type: 'standard', x_pos: 3, y_pos: 5, is_active: true });
                defaultSeats.push({ bus_id: busId, seat_label: '14', seat_type: 'standard', x_pos: 4, y_pos: 5, is_active: true });
            });

            // Generate 17 seats for b-2 (VIP Toyota Hiace)
            defaultSeats.push({ bus_id: 'b-2', seat_label: 'Driver', seat_type: 'driver', x_pos: 0, y_pos: 0, is_active: true });
            defaultSeats.push({ bus_id: 'b-2', seat_label: '1', seat_type: 'front', x_pos: 2, y_pos: 0, is_active: true });
            defaultSeats.push({ bus_id: 'b-2', seat_label: '2', seat_type: 'front', x_pos: 3, y_pos: 0, is_active: true });

            defaultSeats.push({ bus_id: 'b-2', seat_label: '3', seat_type: 'vip', x_pos: 0, y_pos: 1, is_active: true });
            defaultSeats.push({ bus_id: 'b-2', seat_label: '4', seat_type: 'vip', x_pos: 1, y_pos: 1, is_active: true });
            defaultSeats.push({ bus_id: 'b-2', seat_label: '5', seat_type: 'vip', x_pos: 3, y_pos: 1, is_active: true });

            defaultSeats.push({ bus_id: 'b-2', seat_label: '6', seat_type: 'standard', x_pos: 0, y_pos: 2, is_active: true });
            defaultSeats.push({ bus_id: 'b-2', seat_label: '7', seat_type: 'standard', x_pos: 1, y_pos: 2, is_active: true });
            defaultSeats.push({ bus_id: 'b-2', seat_label: '8', seat_type: 'standard', x_pos: 3, y_pos: 2, is_active: true });

            defaultSeats.push({ bus_id: 'b-2', seat_label: '9', seat_type: 'standard', x_pos: 0, y_pos: 3, is_active: true });
            defaultSeats.push({ bus_id: 'b-2', seat_label: '10', seat_type: 'standard', x_pos: 1, y_pos: 3, is_active: true });
            defaultSeats.push({ bus_id: 'b-2', seat_label: '11', seat_type: 'standard', x_pos: 3, y_pos: 3, is_active: true });

            defaultSeats.push({ bus_id: 'b-2', seat_label: '12', seat_type: 'standard', x_pos: 0, y_pos: 4, is_active: true });
            defaultSeats.push({ bus_id: 'b-2', seat_label: '13', seat_type: 'standard', x_pos: 1, y_pos: 4, is_active: true });
            defaultSeats.push({ bus_id: 'b-2', seat_label: '14', seat_type: 'standard', x_pos: 2, y_pos: 4, is_active: true });
            defaultSeats.push({ bus_id: 'b-2', seat_label: '15', seat_type: 'standard', x_pos: 3, y_pos: 4, is_active: true });
            defaultSeats.push({ bus_id: 'b-2', seat_label: '16', seat_type: 'standard', x_pos: 4, y_pos: 4, is_active: true });
            defaultSeats.push({ bus_id: 'b-2', seat_label: '17', seat_type: 'standard', x_pos: 5, y_pos: 4, is_active: true });

            localStorage.setItem('seats', JSON.stringify(defaultSeats));
            seatsCache = defaultSeats;
        } else {
            seatsCache = JSON.parse(localStorage.getItem('seats'));
        }

        if (!localStorage.getItem('reservations')) {
            // Seed standard mock reservations
            const defaultReservations = [
                { id: 'res-1', student_id: 's-1', bus_id: 'b-1', seat_label: '12', reservation_type: 'going', price: 35.00, booking_date: new Date().toISOString(), status: 'confirmed' },
                { id: 'res-2', student_id: 's-2', bus_id: 'b-1', seat_label: '4', reservation_type: 'round_trip', price: 60.00, booking_date: new Date().toISOString(), status: 'confirmed' }
            ];
            localStorage.setItem('reservations', JSON.stringify(defaultReservations));
            reservationsCache = defaultReservations;
        } else {
            reservationsCache = JSON.parse(localStorage.getItem('reservations'));
        }

        if (!localStorage.getItem('seat_locks')) {
            localStorage.setItem('seat_locks', JSON.stringify([]));
            seatLocksCache = [];
        } else {
            seatLocksCache = JSON.parse(localStorage.getItem('seat_locks'));
        }

        if (!localStorage.getItem('attendance')) {
            localStorage.setItem('attendance', JSON.stringify([]));
            attendanceCache = [];
        } else {
            attendanceCache = JSON.parse(localStorage.getItem('attendance'));
        }

        if (!localStorage.getItem('activity_logs')) {
            const defaultLogs = [
                { time: new Date().toISOString(), action: "system_init", details: "نظام حجز باصات الامتحانات تم تفعيله للإنتاج" }
            ];
            localStorage.setItem('activity_logs', JSON.stringify(defaultLogs));
            activityLogsCache = defaultLogs;
        } else {
            activityLogsCache = JSON.parse(localStorage.getItem('activity_logs'));
        }
    } else {
        // Fetch real data from Supabase
        fetchSupabaseData();
    }
}

// Simulating writing a log entry
function writeSystemLog(action, details) {
    const time = new Date().toISOString();
    if (isDemoMode) {
        let logs = JSON.parse(localStorage.getItem('activity_logs')) || [];
        logs.unshift({ time, action, details });
        localStorage.setItem('activity_logs', JSON.stringify(logs));
        activityLogsCache = logs;
    } else {
        // Post activity log in Supabase
        activityLogsCache = [{ time, action, details }, ...activityLogsCache];
        supabaseClient.from('activity_logs').insert({
            user_type: loggedInAdmin ? 'admin' : 'student',
            user_identifier: loggedInAdmin ? loggedInAdmin.username : (loggedInStudent ? loggedInStudent.reservation_code : 'guest'),
            action: action,
            details: details
        }).then(() => { });
    }

    // Update admin terminal logs if visible
    const term = document.getElementById('live-logs-terminal');
    if (term) {
        const item = document.createElement('div');
        item.className = 'live-log-item';
        item.innerHTML = `<span class="live-log-time">[${new Date(time).toLocaleTimeString()}]</span> <strong>${action}:</strong> ${details}`;
        term.insertBefore(item, term.firstChild);
    }
}

async function fetchSupabaseData() {
    try {
        // Load seats first so we can enrich reservations and locks with labels.
        let { data: seats } = await supabaseClient.from('seats').select('*');
        if (seats) seatsCache = seats;

        // Load prices
        let { data: prices } = await supabaseClient.from('pricing').select('*');
        if (prices) {
            prices.forEach(p => {
                pricingCache[p.price_key] = p.price_value;
            });
        }

        // Load buses
        let { data: buses } = await supabaseClient.from('buses').select('*');
        if (buses) {
            busesCache = buses;
            populateAdminCountdownBuses();
        }

        const seatLookup = new Map((seatsCache || []).map(seat => [seat.id, seat.seat_label]));

        // Load students
        let { data: students } = await supabaseClient.from('students').select('*');
        if (students) studentsCache = students;

        // Load reservations
        let { data: res } = await supabaseClient.from('reservations').select('*');
        if (res) reservationsCache = res.map(row => normalizeReservationRow(row, seatLookup));

        // Load seat locks
        let { data: locks } = await supabaseClient.from('seat_locks').select('*');
        if (locks) seatLocksCache = locks.map(row => normalizeLockRow(row, seatLookup));

        // Load attendance
        let { data: attendance } = await supabaseClient.from('attendance').select('*');
        if (attendance) attendanceCache = attendance;

        // Load activity logs
        let { data: logs } = await supabaseClient.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(200);
        if (logs) activityLogsCache = logs.map(normalizeActivityLogRow);

        // Load settings
        let { data: settings } = await supabaseClient.from('settings').select('*');
        if (settings) {
            const cdSetting = settings.find(s => s.setting_key === 'exam_countdown');
            if (cdSetting) {
                localStorage.setItem('exam_countdown', typeof cdSetting.setting_value === 'string' ? cdSetting.setting_value : JSON.stringify(cdSetting.setting_value));
                startExamCountdown();
            }
        }

        // Initialize Realtime subscriptions
        setupRealtimeSub();
        loadBusesToLanding();
        if (document.getElementById('admin-dashboard-page')?.classList.contains('active')) {
            loadAdminOverviewMetrics();
            loadAdminStudentsCRM();
            loadAdminReservations();
            loadAdminBusesCRM();
            loadDesignerBusesSelect();
            loadAdminPricingForm();
        } else if (document.getElementById('student-portal-page')?.classList.contains('active') && loggedInStudent) {
            loadStudentPortalData();
        } else if (document.getElementById('ticket-page')?.classList.contains('active')) {
            const cachedTicket = restoreOfflineTicket();
            if (cachedTicket?.reservation) {
                renderTicketReservation(cachedTicket.reservation);
            }
        }
    } catch (e) {
        console.error("Failed to load Supabase initial data:", e);
        showToast("error", "فشل الاتصال بقاعدة البيانات. يرجى التحقق من اتصال الإنترنت.");
    }
}

function setupRealtimeSub() {
    if (!supabaseClient || realtimeSubscribed) return;
    realtimeSubscribed = true;

    // Subscribe to reservations table changes
    supabaseClient.channel('public:reservations')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, payload => {
            console.log('Realtime reservation update:', payload);
            const seatLookup = new Map((seatsCache || []).map(seat => [seat.id, seat.seat_label]));
            if (payload.eventType === 'INSERT') {
                reservationsCache.push(normalizeReservationRow(payload.new, seatLookup));
            } else if (payload.eventType === 'DELETE') {
                reservationsCache = reservationsCache.filter(r => r.id !== payload.old.id);
            } else if (payload.eventType === 'UPDATE') {
                const idx = reservationsCache.findIndex(r => r.id === payload.new.id);
                if (idx !== -1) reservationsCache[idx] = normalizeReservationRow(payload.new, seatLookup);
            }

            // Refresh UI
            if (selectedBus) {
                renderSeatingMap(selectedBus.id);
            }
            loadBusesToLanding();
            if (document.getElementById('admin-dashboard-page')?.classList.contains('active')) {
                loadAdminOverviewMetrics();
                loadAdminReservations();
            }
        })
        .subscribe();

    // Subscribe to seat_locks table
    supabaseClient.channel('public:seat_locks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'seat_locks' }, payload => {
            console.log('Realtime seat lock update:', payload);
            const seatLookup = new Map((seatsCache || []).map(seat => [seat.id, seat.seat_label]));
            if (payload.eventType === 'INSERT') {
                seatLocksCache.push(normalizeLockRow(payload.new, seatLookup));
            } else if (payload.eventType === 'DELETE') {
                seatLocksCache = seatLocksCache.filter(l => l.id !== payload.old.id);
            } else if (payload.eventType === 'UPDATE') {
                const idx = seatLocksCache.findIndex(l => l.id === payload.new.id);
                if (idx !== -1) seatLocksCache[idx] = normalizeLockRow(payload.new, seatLookup);
            }

            if (selectedBus) {
                renderSeatingMap(selectedBus.id);
            }
        })
        .subscribe();
}

// ==========================================
// LANDING PAGE CONTROLLER
// ==========================================

function loadBusesToLanding() {
    const grid = document.getElementById('landing-bus-grid');
    if (!grid) return;

    grid.innerHTML = '';

    busesCache.forEach(bus => {
        // Count booked seats
        const bookedCount = reservationsCache.filter(r => r.bus_id === bus.id && r.status === 'confirmed').length;
        const availableCount = bus.capacity - bookedCount;
        const fillPct = (bookedCount / bus.capacity) * 100;

        const card = document.createElement('div');
        card.className = 'glass-card bus-card';
        card.innerHTML = `
            <div class="bus-header">
                <span class="bus-title">${bus.name}</span>
                <span class="bus-badge">${bus.departure_time}</span>
            </div>
            <div class="bus-body">
                <div class="bus-body-item">
                    <i data-lucide="user"></i>
                    <span>${bus.driver_name}</span>
                </div>
                <div class="bus-body-item">
                    <i data-lucide="map-pin"></i>
                    <span>${bus.meeting_location}</span>
                </div>
                <div class="bus-body-item">
                    <i data-lucide="users"></i>
                    <span>${translations[currentLanguage]['bc_capacity']}: ${bus.capacity}</span>
                </div>
                <div class="bus-body-item">
                    <i data-lucide="check-square"></i>
                    <span>متاح: ${availableCount} مقعد</span>
                </div>
            </div>
            <div class="bus-footer">
                <div class="bus-capacity-bar">
                    <div class="bus-capacity-fill" style="width: ${fillPct}%"></div>
                </div>
                <button class="btn-primary" style="padding:6px 12px; font-size:0.85rem;" onclick="navigateToPage('auth-page')">
                    <span data-localize="reserve_seat">احجز مقعدك</span>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    lucide.createIcons();

    // Calculate real synchronized statistics
    const totalStudents = studentsCache.length;
    const totalBuses = busesCache.length;
    const totalReservations = reservationsCache.filter(r => r.status === 'confirmed').length;

    let totalCapacity = 0;
    busesCache.forEach(b => totalCapacity += b.capacity);
    const occupancyPct = totalCapacity > 0 ? Math.round((totalReservations / totalCapacity) * 100) : 0;

    // Render real metrics
    document.getElementById('stat-students').innerText = totalStudents;
    document.getElementById('stat-buses').innerText = totalBuses;
    document.getElementById('stat-trips').innerText = totalReservations;
    document.getElementById('stat-satisfaction').innerText = `${occupancyPct}%`;
}

// ==========================================
// STUDENT LOGIN & LOGOUT CONTROLLER
// ==========================================

function switchAuthTab(tab) {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginView = document.getElementById('auth-login-view');
    const registerView = document.getElementById('auth-register-view');

    if (tab === 'login') {
        tabLogin.className = 'btn-primary';
        tabLogin.style.background = 'var(--accent)';
        tabRegister.className = 'btn-outline';
        tabRegister.style.background = 'none';
        loginView.style.display = 'block';
        registerView.style.display = 'none';
    } else {
        tabRegister.className = 'btn-primary';
        tabRegister.style.background = 'var(--accent)';
        tabLogin.className = 'btn-outline';
        tabLogin.style.background = 'none';
        loginView.style.display = 'none';
        registerView.style.display = 'block';
    }
}

async function loginStudent() {
    const phone = document.getElementById('student-login-phone').value.trim();
    const pass = document.getElementById('student-login-pass').value.trim();

    if (!phone || !pass) {
        showToast("warning", "الرجاء إدخال رقم الهاتف وكلمة المرور!");
        return;
    }

    showToast("info", "جاري تسجيل الدخول...");
    try {
        const passHash = await hashPasswordSHA256(pass);
        const { data: students, error } = await supabaseClient.rpc('student_login', {
            p_phone_number: phone,
            p_password_hash: passHash
        });

        if (error) throw error;

        if (students && students.length > 0) {
            loggedInStudent = students[0];
            persistStudentSession(loggedInStudent);
            showToast("success", `أهلاً بك مجدداً يا ${loggedInStudent.full_name}`);

            document.getElementById('student-login-phone').value = '';
            document.getElementById('student-login-pass').value = '';

            navigateToPage('student-portal-page');
            loadStudentPortalData();
        } else {
            showToast("error", "رقم الهاتف أو كلمة المرور غير صحيحة!");
        }
    } catch (err) {
        console.error("Student login failed:", err);
        showToast("error", "تعذر التحقق من بيانات الدخول عبر الخادم.");
    }
}

async function registerStudent() {
    const name = document.getElementById('student-register-name').value.trim();
    const phone = document.getElementById('student-register-phone').value.trim();
    const pass = document.getElementById('student-register-pass').value.trim();

    if (!name || !phone || !pass) {
        showToast("warning", "يرجى تعبئة جميع الحقول المطلوبة!");
        return;
    }

    showToast("info", "جاري إنشاء حسابك...");
    try {
        const passHash = await hashPasswordSHA256(pass);
        const { data: generatedCode, error } = await supabaseClient.rpc('student_register', {
            p_full_name: name,
            p_phone_number: phone,
            p_password_hash: passHash
        });

        if (error) {
            if (error.message && error.message.includes('phone_number_already_registered')) {
                showToast("error", "رقم الهاتف هذا مسجل بالفعل!");
            } else {
                throw error;
            }
            return;
        }

        // Show the generated code in success modal
        document.getElementById('generated-student-code').innerText = generatedCode;
        document.getElementById('registration-success-modal').classList.add('active');

        // Fetch the student profile from database to login directly after they close the modal
        let { data: students, error: fetchError } = await supabaseClient
            .from('students')
            .select('*')
            .eq('reservation_code', generatedCode);

        if (!fetchError && students && students.length > 0) {
            window.pendingLoggedInStudent = students[0];
        }

        // Reset fields
        document.getElementById('student-register-name').value = '';
        document.getElementById('student-register-phone').value = '';
        document.getElementById('student-register-pass').value = '';
    } catch (err) {
        console.error("Register student failed:", err);
        showToast("error", "تعذر إنشاء الحساب على الخادم.");
    }
}

function closeRegistrationSuccessModal() {
    document.getElementById('registration-success-modal').classList.remove('active');
    if (window.pendingLoggedInStudent) {
        loggedInStudent = window.pendingLoggedInStudent;
        persistStudentSession(loggedInStudent);
        showToast("success", `مرحباً بك يا ${loggedInStudent.full_name}`);

        navigateToPage('student-portal-page');
        loadStudentPortalData();

        window.pendingLoggedInStudent = null;
    }
}

function logoutStudent() {
    seatSelectionRequestId++;
    loggedInStudent = null;
    selectedBus = null;
    selectedSeat = null;
    selectedSeatLocked = false;
    if (activeLockTimer) clearInterval(activeLockTimer);
    document.getElementById('lock-timer-banner').style.display = 'none';
    clearStudentSession();
    navigateToPage('landing-page');
    showToast("info", (currentLanguage === 'ar') ? "تم تسجيل الخروج بنجاح." : "Logged out successfully.");
}

// ==========================================
// STUDENT PORTAL & BOOKING PROCESS
// ==========================================

function loadStudentPortalData() {
    if (!loggedInStudent) return;

    document.getElementById('portal-student-name').innerText = loggedInStudent.full_name;
    document.getElementById('portal-student-code').innerText = loggedInStudent.reservation_code;

    // Check if the student has any active confirmed reservation
    const activeRes = reservationsCache.find(r => r.student_id === loggedInStudent.id && r.status === 'confirmed');
    const bookingFlowCard = document.querySelector('.booking-flow-card');
    const activeBookingCard = document.getElementById('active-booking-card');

    if (activeRes) {
        if (bookingFlowCard) bookingFlowCard.style.display = 'none';
        if (activeBookingCard) {
            activeBookingCard.style.display = 'block';
            const bus = busesCache.find(b => b.id === activeRes.bus_id);
            const busName = bus ? bus.name : 'عربيه الحجز';
            document.getElementById('active-booking-desc').innerHTML = `
                لقد قمت بحجز مقعدك بنجاح في <strong>${busName}</strong>. رقم المقعد: <strong>${activeRes.seat_label}</strong>.<br>
                لا يمكنك حجز أكثر من مقعد واحد في النظام.
            `;
        }
    } else {
        if (bookingFlowCard) bookingFlowCard.style.display = 'block';
        if (activeBookingCard) activeBookingCard.style.display = 'none';

        // Initialize Step 1: Render Buses in Student Portal
        loadBusesToPortal();

        // Load pricing configs to selection cards
        document.getElementById('price-going-val').innerText = `${pricingCache.going_price} EGP`;
        document.getElementById('price-return-val').innerText = `${pricingCache.return_price} EGP`;
        document.getElementById('price-round-val').innerText = `${pricingCache.round_trip_price} EGP`;
    }

    // Check student reservation history
    loadStudentBookingHistory();
}

function viewActiveReservationTicket() {
    if (!loggedInStudent) return;
    const activeRes = reservationsCache.find(r => r.student_id === loggedInStudent.id && r.status === 'confirmed');
    if (activeRes) {
        viewDigitalTicket(activeRes);
    } else {
        showToast("error", "لم يتم العثور على حجز نشط.");
    }
}

function studentHasConfirmedReservationOnBus(busId) {
    if (!loggedInStudent) return false;
    return reservationsCache.some(r =>
        r.student_id === loggedInStudent.id &&
        r.bus_id === busId &&
        r.status === 'confirmed'
    );
}

function loadBusesToPortal() {
    const grid = document.getElementById('portal-bus-grid');
    if (!grid) return;

    grid.innerHTML = '';

    busesCache.forEach(bus => {
        const bookedCount = reservationsCache.filter(r => r.bus_id === bus.id && r.status === 'confirmed').length;
        const fillPct = (bookedCount / bus.capacity) * 100;

        const card = document.createElement('div');
        const alreadyBookedHere = studentHasConfirmedReservationOnBus(bus.id);
        card.className = `glass-card bus-card ${selectedBus && selectedBus.id === bus.id ? 'selected' : ''} ${alreadyBookedHere ? 'disabled' : ''}`;
        card.onclick = () => selectBusForBooking(bus);
        card.innerHTML = `
            <div class="bus-header">
                <span class="bus-title">${bus.name}</span>
                <span class="bus-badge">${bus.departure_time}</span>
            </div>
            <div class="bus-body">
                <div class="bus-body-item">
                    <i data-lucide="user"></i>
                    <span>${bus.driver_name}</span>
                </div>
                <div class="bus-body-item">
                    <i data-lucide="map-pin"></i>
                    <span>${bus.meeting_location}</span>
                </div>
                <div class="bus-body-item">
                    <i data-lucide="users"></i>
                    <span>السعة: ${bus.capacity} مقعد</span>
                </div>
                <div class="bus-body-item">
                    <i data-lucide="alert-circle"></i>
                    <span>محجوز: ${bookedCount} / ${bus.capacity}</span>
                </div>
            </div>
            <div class="bus-footer" style="border-top:none; padding-top:0;">
                <div class="bus-capacity-bar" style="margin-left:0;">
                    <div class="bus-capacity-fill" style="width: ${fillPct}%"></div>
                </div>
                ${alreadyBookedHere ? '<div style="margin-top:10px; color: var(--danger); font-weight:700; font-size:0.85rem;">تم الحجز مسبقًا على هذه العربية</div>' : ''}
            </div>
        `;
        grid.appendChild(card);
    });
    lucide.createIcons();
}

function selectBusForBooking(bus) {
    if (studentHasConfirmedReservationOnBus(bus.id)) {
        showToast("warning", (currentLanguage === 'ar') ? "لديك حجز بالفعل على هذه العربية." : "You already have a booking on this bus.");
        return;
    }
    selectedBus = bus;
    loadBusesToPortal();
    // Automatically advance to step 2: Trip Type selection
    changeBookingStep(2);
}

function selectTripType(type, el) {
    selectedTripType = type;
    document.querySelectorAll('.trip-type-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
}

function changeBookingStep(stepNum) {
    document.querySelectorAll('.step-indicator').forEach((ind, i) => {
        ind.classList.remove('active', 'completed');
        if (i + 1 < stepNum) {
            ind.classList.add('completed');
        } else if (i + 1 === stepNum) {
            ind.classList.add('active');
        }
    });

    document.querySelectorAll('.flow-step').forEach(step => {
        step.classList.remove('active');
    });

    if (stepNum === 1) {
        document.getElementById('step-bus-select').classList.add('active');
    } else if (stepNum === 2) {
        document.getElementById('step-type-select').classList.add('active');
    } else if (stepNum === 3) {
        document.getElementById('step-seat-select').classList.add('active');
        // Render seating layout for the selected bus
        renderSeatingMap(selectedBus.id);
    }
}

function releaseCurrentLockAndBack() {
    seatSelectionRequestId++;
    if (selectedSeat) {
        releaseSeatLockOnDatabase(selectedBus.id, selectedSeat.seat_label);
    }
    changeBookingStep(2);
}

async function releaseSpecificSeatLock(busId, seat) {
    if (!seat) return;

    if (isDemoMode) {
        let locks = JSON.parse(localStorage.getItem('seat_locks')) || [];
        locks = locks.filter(l => !(l.bus_id === busId && l.seat_label === seat.seat_label && l.student_id === loggedInStudent.id));
        localStorage.setItem('seat_locks', JSON.stringify(locks));
        seatLocksCache = locks;
    } else {
        try {
            await supabaseClient.rpc('unlock_seat', {
                p_student_id: loggedInStudent.id,
                p_bus_id: busId,
                p_seat_id: seat.id
            });
        } catch (e) { }
    }
}

// ==========================================
// SEAT RENDER & LOCK TIMING SYSTEM
// ==========================================

async function renderSeatingMap(busId) {
    const grid = document.getElementById('seating-layout-grid');
    grid.innerHTML = '';

    // Retrieve seats configured for this bus
    let seats = [];

    if (isDemoMode) {
        const allSeats = JSON.parse(localStorage.getItem('seats')) || [];
        seats = allSeats.filter(s => s.bus_id === busId);

        // If no seats configured for this bus, create defaults automatically
        if (seats.length === 0) {
            seats = generateDefaultSeatsForBus(busId, selectedBus.capacity);
        }
    } else {
        // Fetch from Supabase
        try {
            let { data } = await supabaseClient.from('seats').select('*').eq('bus_id', busId);
            if (data) seats = data;
        } catch (e) {
            console.error("Error loading seats from DB:", e);
        }
    }

    // Calculate grid columns and rows to arrange seats neatly
    let maxX = 0, maxY = 0;
    seats.forEach(s => {
        if (s.x_pos > maxX) maxX = s.x_pos;
        if (s.y_pos > maxY) maxY = s.y_pos;
    });

    grid.style.gridTemplateColumns = `repeat(${maxX + 1}, 1fr)`;

    // Build a lookup grid map
    const seatMap = {};
    seats.forEach(s => {
        seatMap[`${s.x_pos},${s.y_pos}`] = s;
    });

    // Get current active locks and reservations on this bus
    let reservations = reservationsCache.filter(r => r.bus_id === busId && r.status === 'confirmed');
    let locks = seatLocksCache.filter(l => l.bus_id === busId && new Date(l.locked_until) > new Date());

    if (isDemoMode) {
        const allLocks = JSON.parse(localStorage.getItem('seat_locks')) || [];
        locks = allLocks.filter(l => l.bus_id === busId && new Date(l.locked_until) > new Date());
    }

    // Render row-by-row
    for (let y = 0; y <= maxY; y++) {
        for (let x = 0; x <= maxX; x++) {
            const coord = `${x},${y}`;
            const seat = seatMap[coord];

            if (!seat) {
                // Render empty space / aisle
                const empty = document.createElement('div');
                empty.className = 'seat-placeholder';
                grid.appendChild(empty);
                continue;
            }

            const seatEl = document.createElement('div');
            seatEl.className = 'seat-item';

            // Set custom styling attributes based on type
            seatEl.classList.add(`${seat.seat_type}-seat`);

            // Determine Status
            const isReserved = reservations.some(r => r.seat_label === seat.seat_label || (r.seat_id === seat.id));
            const currentLock = locks.find(l => l.seat_label === seat.seat_label || (l.seat_id === seat.id));

            if (seat.seat_type === 'driver') {
                seatEl.classList.add('driver-seat');
                seatEl.innerHTML = `<i data-lucide="circle-dot"></i><span style="font-size:0.65rem;">${(currentLanguage === 'ar') ? 'سائق' : 'Driver'}</span>`;
            } else if (isReserved) {
                seatEl.classList.add('reserved');
                seatEl.innerHTML = `<i data-lucide="user-x"></i><span>${seat.seat_label}</span>`;
            } else if (currentLock) {
                const isMyLock = currentLock.student_id === loggedInStudent.id;
                const isPreviewSelected = selectedSeat && selectedSeat.id === seat.id;

                if (isMyLock && (!selectedSeat || isPreviewSelected)) {
                    seatEl.classList.add('selected');
                    seatEl.innerHTML = `<i data-lucide="user-check"></i><span>${seat.seat_label}</span>`;
                    selectedSeat = seat;
                    selectedSeatLocked = true;
                } else if (isMyLock) {
                    seatEl.classList.add('locked');
                    seatEl.innerHTML = `<i data-lucide="lock"></i><span>${seat.seat_label}</span>`;
                } else {
                    seatEl.classList.add('locked');
                    seatEl.innerHTML = `<i data-lucide="lock"></i><span>${seat.seat_label}</span>`;
                }
            } else if (selectedSeat && selectedSeat.id === seat.id) {
                seatEl.classList.add('selected');
                seatEl.innerHTML = `<i data-lucide="user-check"></i><span>${seat.seat_label}</span>`;
            } else {
                // Available
                seatEl.classList.add('available');
                seatEl.innerHTML = `<i data-lucide="armchair"></i><span>${seat.seat_label}</span>`;

                // Selectable click handler
                seatEl.onclick = () => selectSeatAndLock(seat);
            }

            grid.appendChild(seatEl);
        }
    }

    lucide.createIcons();
}

function generateDefaultSeatsForBus(busId, capacity) {
    let list = [];
    // Generate standard 14 capacity layouts (Toyota Hiace template)
    if (capacity <= 14) {
        list = [
            { bus_id: busId, seat_label: 'Driver', seat_type: 'driver', x_pos: 0, y_pos: 0, is_active: true },
            { bus_id: busId, seat_label: '1', seat_type: 'front', x_pos: 2, y_pos: 0, is_active: true },
            { bus_id: busId, seat_label: '2', seat_type: 'standard', x_pos: 0, y_pos: 1, is_active: true },
            { bus_id: busId, seat_label: '3', seat_type: 'standard', x_pos: 2, y_pos: 1, is_active: true },
            { bus_id: busId, seat_label: '4', seat_type: 'standard', x_pos: 0, y_pos: 2, is_active: true },
            { bus_id: busId, seat_label: '5', seat_type: 'standard', x_pos: 2, y_pos: 2, is_active: true },
            { bus_id: busId, seat_label: '6', seat_type: 'standard', x_pos: 0, y_pos: 3, is_active: true },
            { bus_id: busId, seat_label: '7', seat_type: 'standard', x_pos: 2, y_pos: 3, is_active: true },
            { bus_id: busId, seat_label: '8', seat_type: 'standard', x_pos: 0, y_pos: 4, is_active: true },
            { bus_id: busId, seat_label: '9', seat_type: 'standard', x_pos: 2, y_pos: 4, is_active: true },
            { bus_id: busId, seat_label: '10', seat_type: 'standard', x_pos: 0, y_pos: 5, is_active: true },
            { bus_id: busId, seat_label: '11', seat_type: 'standard', x_pos: 1, y_pos: 5, is_active: true },
            { bus_id: busId, seat_label: '12', seat_type: 'standard', x_pos: 2, y_pos: 5, is_active: true },
            { bus_id: busId, seat_label: '13', seat_type: 'standard', x_pos: 3, y_pos: 5, is_active: true },
            { bus_id: busId, seat_label: '14', seat_type: 'standard', x_pos: 4, y_pos: 5, is_active: true }
        ];
    } else {
        // Generate a grid of seats matching the capacity
        list.push({ bus_id: busId, seat_label: 'Driver', seat_type: 'driver', x_pos: 0, y_pos: 0, is_active: true });
        let count = 1;
        for (let r = 1; r < 6; r++) {
            for (let c = 0; c < 4; c++) {
                if (c === 2) continue; // aisle
                if (count > capacity) break;
                list.push({
                    bus_id: busId,
                    seat_label: String(count),
                    seat_type: (r === 1 ? 'front' : (r === 2 ? 'vip' : 'standard')),
                    x_pos: c,
                    y_pos: r,
                    is_active: true
                });
                count++;
            }
        }
    }

    if (isDemoMode) {
        const all = JSON.parse(localStorage.getItem('seats')) || [];
        const filtered = all.filter(s => s.bus_id !== busId);
        localStorage.setItem('seats', JSON.stringify([...filtered, ...list]));
    }
    return list;
}

async function selectSeatAndLock(seat) {
    if (!seat || !selectedBus) return;

    if (selectedSeat && selectedSeat.id === seat.id && selectedSeatLocked) {
        showToast("info", (currentLanguage === 'ar') ? "هذا هو المقعد المحدد بالفعل." : "This seat is already selected.");
        return;
    }

    const requestId = ++seatSelectionRequestId;
    const previousSeat = selectedSeat;
    const previousLocked = selectedSeatLocked;

    // Show the new selection immediately.
    selectedSeat = seat;
    selectedSeatLocked = false;
    document.getElementById('confirm-booking-btn').disabled = true;
    renderSeatingMap(selectedBus.id);

    showToast("info", (currentLanguage === 'ar') ? "جارٍ تثبيت المقعد المختار..." : "Selecting your seat...");

    const lockSuccess = await writeSeatLockOnDatabase(selectedBus.id, seat);
    if (requestId !== seatSelectionRequestId) return;

    if (lockSuccess) {
        if (previousSeat && previousLocked && previousSeat.id !== seat.id) {
            await releaseSpecificSeatLock(selectedBus.id, previousSeat);
        }

        selectedSeat = seat;
        selectedSeatLocked = true;
        document.getElementById('confirm-booking-btn').disabled = false;
        showToast("success", (currentLanguage === 'ar') ? `تم اختيار مقعدك رقم ${seat.seat_label} بنجاح` : `Seat ${seat.seat_label} selected successfully`);
        startLockCountdown(180);
        renderSeatingMap(selectedBus.id);
    } else {
        selectedSeat = previousSeat || null;
        selectedSeatLocked = !!(previousSeat && previousLocked);
        document.getElementById('confirm-booking-btn').disabled = !(selectedSeat && selectedSeatLocked);
        showToast("error", (currentLanguage === 'ar') ? "عذراً! هذا المقعد لم يعد متاحًا." : "Sorry! This seat is no longer available.");
        renderSeatingMap(selectedBus.id);
    }
}

async function writeSeatLockOnDatabase(busId, seat) {
    const expiry = new Date(new Date().getTime() + 3 * 60 * 1000).toISOString();
    const seatLabel = seat.seat_label;

    if (isDemoMode) {
        let locks = JSON.parse(localStorage.getItem('seat_locks')) || [];

        // Clear expired locks first
        locks = locks.filter(l => new Date(l.locked_until) > new Date());

        // Check if seat is already locked by someone else
        const conflict = locks.some(l => l.bus_id === busId && l.seat_label === seatLabel && l.student_id !== loggedInStudent.id);

        if (conflict) return false;

        // Upsert lock
        const existingIdx = locks.findIndex(l => l.bus_id === busId && l.seat_label === seatLabel);
        if (existingIdx !== -1) {
            locks[existingIdx].locked_until = expiry;
            locks[existingIdx].student_id = loggedInStudent.id;
        } else {
            locks.push({
                id: 'lock-' + Math.random().toString(36).substr(2, 9),
                bus_id: busId,
                seat_label: seatLabel,
                student_id: loggedInStudent.id,
                locked_until: expiry
            });
        }

        localStorage.setItem('seat_locks', JSON.stringify(locks));
        seatLocksCache = locks;
        return true;
    } else {
        // Call Supabase lock RPC or manual lock insert
        try {
            const { data, error } = await supabaseClient.rpc('lock_seat', {
                p_student_id: loggedInStudent.id,
                p_bus_id: busId,
                p_seat_id: seat.id // wait, RPC parameter requires seat UUID, let's make sure we find the seat UUID
            });

            if (error) throw error;
            return data;
        } catch (e) {
            console.error("DB locking exception:", e);
            return false;
        }
    }
}

async function releaseSeatLockOnDatabase(busId, seatLabel) {
    if (isDemoMode) {
        let locks = JSON.parse(localStorage.getItem('seat_locks')) || [];
        locks = locks.filter(l => !(l.bus_id === busId && l.seat_label === seatLabel && l.student_id === loggedInStudent.id));
        localStorage.setItem('seat_locks', JSON.stringify(locks));
        seatLocksCache = locks;
    } else {
        // RPC unlock
        try {
            await supabaseClient.rpc('unlock_seat', {
                p_student_id: loggedInStudent.id,
                p_bus_id: busId,
                p_seat_id: selectedSeat.id
            });
        } catch (e) { }
    }

    selectedSeat = null;
    selectedSeatLocked = false;
    document.getElementById('confirm-booking-btn').disabled = true;
    if (activeLockTimer) clearInterval(activeLockTimer);
    document.getElementById('lock-timer-banner').style.display = 'none';
}

function startLockCountdown(seconds) {
    activeLockTimeRemaining = seconds;
    const banner = document.getElementById('lock-timer-banner');
    const countdownEl = document.getElementById('lock-countdown');

    banner.style.display = 'flex';

    if (activeLockTimer) clearInterval(activeLockTimer);

    activeLockTimer = setInterval(() => {
        activeLockTimeRemaining--;

        const mins = Math.floor(activeLockTimeRemaining / 60);
        const secs = activeLockTimeRemaining % 60;
        countdownEl.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        if (activeLockTimeRemaining <= 0) {
            clearInterval(activeLockTimer);
            banner.style.display = 'none';
            showToast("warning", (currentLanguage === 'ar') ? "انتهت مهلة الحجز المحددة! تم تحرير المقعد." : "Lock expired! The seat was released.");
            releaseSeatLockOnDatabase(selectedBus.id, selectedSeat.seat_label);
            renderSeatingMap(selectedBus.id);
        }
    }, 1000);
}

// ==========================================
// BOOKING CONFIRMATION & FARE CALCULATION
// ==========================================

function calculateTotalPrice() {
    if (!selectedSeat) return 0;

    let basePrice = 0;
    if (selectedTripType === 'going') basePrice = Number(pricingCache.going_price);
    if (selectedTripType === 'return') basePrice = Number(pricingCache.return_price);
    if (selectedTripType === 'round_trip') basePrice = Number(pricingCache.round_trip_price);

    // Seat surcharges
    let surcharge = 0;
    if (selectedSeat.seat_type === 'vip') surcharge = Number(pricingCache.vip_seat_fee);
    if (selectedSeat.seat_type === 'front') surcharge = Number(pricingCache.front_seat_fee);

    let total = basePrice + surcharge - Number(pricingCache.discount_amount);
    return Math.max(0, total);
}

function openConfirmationModal() {
    if (!selectedSeat || !selectedBus) return;

    document.getElementById('conf-student-name').innerText = loggedInStudent.full_name;
    document.getElementById('conf-bus-name').innerText = selectedBus.name;
    document.getElementById('conf-seat-num').innerText = selectedSeat.seat_label;

    let typeLabel = 'ذهاب فقط';
    if (selectedTripType === 'return') typeLabel = 'عودة فقط';
    if (selectedTripType === 'round_trip') typeLabel = 'ذهاب وعودة';

    if (currentLanguage === 'en') {
        typeLabel = selectedTripType.toUpperCase().replace('_', ' ');
    }

    document.getElementById('conf-trip-type').innerText = typeLabel;
    document.getElementById('conf-total-price').innerText = `${calculateTotalPrice()} EGP`;

    document.getElementById('confirmation-modal').classList.add('active');
}

function closeConfirmationModal() {
    document.getElementById('confirmation-modal').classList.remove('active');
}

async function finalizeBookingReservation() {
    closeConfirmationModal();
    showToast("info", (currentLanguage === 'ar') ? "جاري تسجيل حجزك وإصدار التذكرة..." : "Finalizing reservation...");

    const ticketPrice = calculateTotalPrice();
    const resId = 'res-' + Math.random().toString(36).substr(2, 9);

    const studentAlreadyHasAnyReservation = reservationsCache.some(r => r.student_id === loggedInStudent.id && r.status === 'confirmed');
    if (studentAlreadyHasAnyReservation) {
        showToast("error", (currentLanguage === 'ar') ? "لديك حجز مؤكد بالفعل في النظام، لا يمكنك حجز مقعد آخر." : "You already have a confirmed booking in the system.");
        releaseSeatLockOnDatabase(selectedBus.id, selectedSeat.seat_label);
        renderSeatingMap(selectedBus.id);
        return;
    }

    if (isDemoMode) {
        // Insert into Local Storage Mock
        let reservations = JSON.parse(localStorage.getItem('reservations')) || [];

        const studentAlreadyBooked = reservations.some(r =>
            r.student_id === loggedInStudent.id &&
            r.status === 'confirmed'
        );
        if (studentAlreadyBooked) {
            showToast("error", (currentLanguage === 'ar') ? "لديك حجز مؤكد بالفعل في النظام، لا يمكنك حجز مقعد آخر." : "You already have a confirmed booking in the system.");
            releaseSeatLockOnDatabase(selectedBus.id, selectedSeat.seat_label);
            renderSeatingMap(selectedBus.id);
            return;
        }

        // Verify seat is not double-booked in DB
        const collision = reservations.some(r => r.bus_id === selectedBus.id && r.seat_label === selectedSeat.seat_label && r.status === 'confirmed');

        if (collision) {
            showToast("error", (currentLanguage === 'ar') ? "خطأ! تم حجز هذا المقعد من طالب آخر أثناء تأكيدك للحجز." : "Double-booking collision! Seat reserved by another student.");
            releaseSeatLockOnDatabase(selectedBus.id, selectedSeat.seat_label);
            renderSeatingMap(selectedBus.id);
            return;
        }

        const newRes = {
            id: resId,
            student_id: loggedInStudent.id,
            bus_id: selectedBus.id,
            seat_label: selectedSeat.seat_label,
            reservation_type: selectedTripType,
            price: ticketPrice,
            booking_date: new Date().toISOString(),
            status: 'confirmed'
        };

        reservations.push(newRes);
        localStorage.setItem('reservations', JSON.stringify(reservations));
        reservationsCache = reservations;

        // Clear local seat lock
        let locks = JSON.parse(localStorage.getItem('seat_locks')) || [];
        locks = locks.filter(l => !(l.bus_id === selectedBus.id && l.seat_label === selectedSeat.seat_label));
        localStorage.setItem('seat_locks', JSON.stringify(locks));
        seatLocksCache = locks;

        writeSystemLog("ticket_booked", `حجز مقعد ناجح: الطالب ${loggedInStudent.full_name} حجز المقعد ${selectedSeat.seat_label} في الباص ${selectedBus.name}`);

        showToast("success", (currentLanguage === 'ar') ? "تم تأكيد الحجز بنجاح! جاري عرض التذكرة الرقمية." : "Reservation successful! Rendering your digital ticket.");

        // Cancel timers
        if (activeLockTimer) clearInterval(activeLockTimer);
        document.getElementById('lock-timer-banner').style.display = 'none';
        selectedSeatLocked = false;

        // Load Digital ticket view
        viewDigitalTicket(newRes);
    } else {
        // Supabase Transaction confirm_reservation RPC
        try {
            const { data, error } = await supabaseClient.rpc('confirm_reservation', {
                p_student_id: loggedInStudent.id,
                p_bus_id: selectedBus.id,
                p_seat_id: selectedSeat.id,
                p_reservation_type: selectedTripType,
                p_price: ticketPrice
            });

            if (error) throw error;

            // Fetch updated tables
            fetchSupabaseData();

            showToast("success", "تم الحجز بنجاح على قاعدة البيانات.");

            // Route to ticket
            const mockResObj = {
                id: data, // returns the created reservation UUID
                student_id: loggedInStudent.id,
                bus_id: selectedBus.id,
                seat_label: selectedSeat.seat_label,
                reservation_type: selectedTripType,
                price: ticketPrice,
                booking_date: new Date().toISOString()
            };
            selectedSeatLocked = false;
            viewDigitalTicket(mockResObj);
        } catch (err) {
            console.error("Booking error details:", err);
            showToast("error", "حدث خطأ أثناء الاتصال بالخادم. يرجى إعادة المحاولة.");
        }
    }
}

// ==========================================
// DIGITAL TICKET DESIGN ENGINE
// ==========================================

function viewDigitalTicket(reservation) {
    navigateToPage('ticket-page');
    setTimeout(() => renderTicketReservation(reservation), 0);
}

function printTicket() {
    window.print();
}

function downloadTicketPDF() {
    const ticket = document.getElementById('printable-ticket');
    const opt = {
        margin: 10,
        filename: `ExamBus-Ticket-${document.getElementById('t-res-code').innerText}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(ticket).save().then(() => {
        showToast("success", "تم تحميل التذكرة بصيغة PDF بنجاح!");
    });
}

function loadStudentBookingHistory() {
    const tbody = document.getElementById('student-history-tbody');
    tbody.innerHTML = '';

    const studentRes = reservationsCache.filter(r => r.student_id === loggedInStudent.id);

    if (studentRes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-secondary);">لا توجد حجوزات سابقة مسجلة.</td></tr>`;
        document.getElementById('history-box').style.display = 'block';
        return;
    }

    studentRes.forEach(r => {
        const bus = busesCache.find(b => b.id === r.bus_id);
        const busName = bus ? bus.name : 'عربيه محذوفة';
        const dateStr = new Date(r.booking_date).toLocaleDateString();

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>${busName}</td>
            <td><strong style="color:var(--accent)">${r.seat_label}</strong></td>
            <td>${r.reservation_type}</td>
            <td>${r.price} EGP</td>
            <td><span style="color:var(--accent); font-weight:700;">${r.status}</span></td>
            <td>
                <button class="btn-primary" style="padding:4px 8px; font-size:0.75rem;" onclick="viewHistoryTicket('${r.id}')"><i data-lucide="eye"></i> عرض</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('history-box').style.display = 'block';
    lucide.createIcons();
}

function viewHistoryTicket(resId) {
    const res = reservationsCache.find(r => r.id === resId);
    if (res) {
        viewDigitalTicket(res);
    }
}


// ==========================================
// 10. ADVANCED ADMIN CONTROLLER & ANALYTICS
// ==========================================

async function authenticateAdmin() {
    const user = document.getElementById('admin-user-input').value.trim();
    const pass = document.getElementById('admin-pass-input').value.trim();

    if (!user || !pass) {
        showToast("warning", "الرجاء إدخال اسم المستخدم وكلمة المرور!");
        return;
    }

    const simulatedHash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'; // admin123

    const grantAdminAccess = async (message, actualHash) => {
        loggedInAdmin = { username: user, role: 'super_admin', passHash: actualHash || simulatedHash };
        persistAdminSession(loggedInAdmin);
        showToast("success", message);
        document.getElementById('admin-user-input').value = '';
        document.getElementById('admin-pass-input').value = '';
        writeSystemLog("admin_login", `تم تسجيل دخول المسؤول: ${user}`);
        navigateToPage('admin-dashboard-page');
        if (!isDemoMode) {
            await fetchSupabaseData();
        }
    };

    if (isDemoMode) {
        if (user === 'admin' && pass === 'admin123') {
            await grantAdminAccess("أهلاً بك كمسؤول نظام امتحانات جو.", simulatedHash);
        } else {
            showToast("error", "اسم المستخدم أو كلمة المرور خاطئة!");
        }
    } else {
        try {
            const passHash = await hashPasswordSHA256(pass);
            const { data, error } = await supabaseClient.rpc('verify_admin', {
                p_username: user,
                p_password_hash: passHash
            });

            if (error) throw error;

            if (data) {
                await grantAdminAccess("أهلاً بك كمسؤول نظام.", passHash);
            } else {
                showToast("error", "اسم المستخدم أو كلمة المرور خاطئة!");
            }
        } catch (err) {
            console.error("Admin login failed:", err);
            showToast("error", "تعذر التحقق من بيانات المسؤول عبر الخادم.");
        }
    }
}

function logoutAdmin() {
    clearAdminSession();
    loggedInAdmin = null;
    navigateToPage('landing-page');
    showToast("info", "تم تسجيل خروج المشرف بنجاح.");
}

function switchAdminSection(sectionId, el) {
    document.querySelectorAll('.admin-nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));

    el.classList.add('active');
    document.getElementById(sectionId).classList.add('active');

    // Scanner control
    if (sectionId === 'admin-scanner') {
        startCameraQRScanner();
    } else {
        stopCameraQRScanner();
    }

    if (sectionId === 'admin-reservations') {
        loadAdminReservations();
    }
}

// --- SECTION A: METRICS & GRAPHS ---
function loadAdminOverviewMetrics() {
    const activeRes = reservationsCache.filter(r => r.status === 'confirmed');

    // Calculations
    const totalStudentsCount = studentsCache.length;
    const activeReservationsCount = activeRes.length;

    let totalCapacity = 0;
    busesCache.forEach(b => totalCapacity += b.capacity);

    const occupancyPct = totalCapacity > 0 ? Math.round((activeReservationsCount / totalCapacity) * 100) : 0;

    let revenue = 0;
    activeRes.forEach(r => revenue += Number(r.price));

    // Set text counters
    document.getElementById('m-total-students').innerText = totalStudentsCount;
    document.getElementById('m-total-res').innerText = activeReservationsCount;
    document.getElementById('m-occupancy').innerText = `${occupancyPct}%`;
    document.getElementById('m-revenue').innerText = `${revenue} EGP`;

    // Draw Charts
    renderAdminCharts();

    // Stream activity logs
    const logsContainer = document.getElementById('live-logs-terminal');
    logsContainer.innerHTML = '';
    activityLogsCache.forEach(log => {
        const item = document.createElement('div');
        item.className = 'live-log-item';
        item.innerHTML = `<span class="live-log-time">[${new Date(log.time || log.created_at).toLocaleTimeString()}]</span> <strong>${log.action}:</strong> ${log.details}`;
        logsContainer.appendChild(item);
    });
}

function renderAdminCharts() {
    // Charts removed from the admin dashboard by request.
    return;
}

// --- SECTION B: STUDENT CRM ---
function loadAdminStudentsCRM() {
    const tbody = document.getElementById('admin-students-tbody');
    tbody.innerHTML = '';

    document.getElementById('crm-student-count').innerText = studentsCache.length;

    studentsCache.forEach(student => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${student.full_name}</strong></td>
            <td><code style="color:var(--accent); font-weight:700;">${student.reservation_code}</code></td>
            <td>${student.phone_number}</td>
            <td>${new Date().toLocaleDateString()}</td>
            <td><span style="font-size:0.8rem; color:var(--text-secondary);">${student.notes || ''}</span></td>
            <td>
                <div style="display:flex; gap:5px;">
                    <button class="btn-outline" style="padding:4px 8px; font-size:0.75rem;" onclick="openStudentModal('${student.id}')"><i data-lucide="edit"></i></button>
                    <button class="btn-outline" style="padding:4px 8px; font-size:0.75rem; color:var(--danger); border-color:var(--danger)" onclick="deleteStudentCRM('${student.id}')"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function getReservationStatusLabel(status) {
    if (status === 'cancelled') return 'ملغي';
    if (status === 'attended') return 'حضر';
    return 'مؤكد';
}

function getReservationStatusColor(status) {
    if (status === 'cancelled') return 'var(--danger)';
    if (status === 'attended') return 'var(--accent)';
    return 'var(--selected)';
}

function loadAdminReservations() {
    const tbody = document.getElementById('admin-reservations-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const visibleReservations = reservationsCache.slice().sort((a, b) => {
        const left = new Date(b.booking_date || b.created_at || 0).getTime();
        const right = new Date(a.booking_date || a.created_at || 0).getTime();
        return left - right;
    });

    document.getElementById('admin-reservations-count').innerText = visibleReservations.filter(r => r.status === 'confirmed').length;

    if (visibleReservations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-secondary);">لا توجد حجوزات حتى الآن.</td></tr>`;
        lucide.createIcons();
        return;
    }

    visibleReservations.forEach(reservation => {
        const student = studentsCache.find(s => s.id === reservation.student_id);
        const bus = busesCache.find(b => b.id === reservation.bus_id);
        const studentName = student ? student.full_name : (reservation.student_name || 'طالب غير معروف');
        const busName = bus ? bus.name : 'عربيه محذوفة';
        const statusColor = getReservationStatusColor(reservation.status);
        const statusLabel = getReservationStatusLabel(reservation.status);
        const dateStr = new Date(reservation.booking_date || reservation.created_at || Date.now()).toLocaleString();

        const tr = document.createElement('tr');
        tr.dataset.search = `${studentName} ${busName} ${reservation.seat_label || ''} ${reservation.reservation_type || ''} ${reservation.status || ''}`.toLowerCase();
        const canCancel = reservation.status !== 'cancelled';
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>
                <strong>${studentName}</strong><br>
                <small style="color:var(--text-secondary)">${student ? student.reservation_code : (reservation.student_code || '')}</small>
            </td>
            <td>${busName}</td>
            <td><span style="color:var(--accent); font-weight:700;">${reservation.seat_label || '-'}</span></td>
            <td>${reservation.reservation_type || '-'}</td>
            <td>${Number(reservation.price || 0).toFixed(2)} EGP</td>
            <td><span style="color:${statusColor}; font-weight:700;">${statusLabel}</span></td>
            <td>
                <div style="display:flex; gap:5px; flex-wrap:wrap;">
                    <button class="btn-outline" style="padding:4px 8px; font-size:0.75rem; color:var(--danger); border-color:var(--danger)" onclick="cancelReservationAdmin('${reservation.id}')" ${canCancel ? '' : 'disabled'}>
                        <i data-lucide="x-circle"></i>
                        ${canCancel ? 'إلغاء' : 'ملغي'}
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    filterReservationsTable();
    lucide.createIcons();
}

function filterReservationsTable() {
    const query = document.getElementById('reservation-search-input')?.value.trim().toLowerCase() || '';
    const rows = document.querySelectorAll('#admin-reservations-tbody tr');

    rows.forEach(row => {
        const haystack = row.dataset.search || row.innerText.toLowerCase();
        row.style.display = haystack.includes(query) ? '' : 'none';
    });
}

async function cancelReservationAdmin(reservationId) {
    const reservation = reservationsCache.find(r => r.id === reservationId);
    if (!reservation) {
        showToast("error", "لم يتم العثور على الحجز المطلوب.");
        return;
    }

    const confirmMessage = `هل أنت متأكد من إلغاء حجز الطالب على المقعد ${reservation.seat_label || ''}؟`;
    if (!confirm(confirmMessage)) return;

    if (isDemoMode) {
        reservationsCache = reservationsCache.map(r => (
            r.id === reservationId ? { ...r, status: 'cancelled' } : r
        ));
        localStorage.setItem('reservations', JSON.stringify(reservationsCache));
        showToast("success", "تم إلغاء الحجز بنجاح.");
        writeSystemLog("cancel_reservation", `تم إلغاء الحجز محلياً: ${reservationId}`);
        loadAdminReservations();
        loadAdminOverviewMetrics();
        if (selectedBus) renderSeatingMap(selectedBus.id);
        loadBusesToLanding();
        return;
    }

    try {
        const { error } = await supabaseClient.rpc('admin_cancel_reservation', {
            p_admin_user: loggedInAdmin.username,
            p_admin_pass_hash: loggedInAdmin.passHash,
            p_reservation_id: reservationId
        });

        if (error) throw error;

        showToast("success", "تم إلغاء الحجز بنجاح.");
        writeSystemLog("cancel_reservation", `تم إلغاء الحجز: ${reservationId}`);
        await fetchSupabaseData();
        loadAdminReservations();
    } catch (err) {
        console.error("Cancel reservation failed:", err);
        showToast("error", "تعذر إلغاء الحجز على الخادم.");
    }
}

function filterStudentsTable() {
    const query = document.getElementById('student-search-input').value.toLowerCase();
    const rows = document.querySelectorAll('#admin-students-tbody tr');

    rows.forEach(row => {
        const name = row.children[0].innerText.toLowerCase();
        const code = row.children[1].innerText.toLowerCase();
        if (name.includes(query) || code.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function openStudentModal(studentId = '') {
    const modal = document.getElementById('student-modal');
    const title = document.getElementById('student-modal-title');

    if (studentId) {
        title.innerText = 'تعديل بيانات طالب';
        const s = studentsCache.find(x => x.id === studentId);
        if (s) {
            document.getElementById('student-modal-id').value = s.id;
            document.getElementById('student-modal-name').value = s.full_name;
            document.getElementById('student-modal-code').value = s.reservation_code;
            document.getElementById('student-modal-phone').value = s.phone_number;
            document.getElementById('student-modal-notes').value = s.notes || '';
        } else {
            showToast("error", "لم يتم العثور على بيانات هذا الطالب!");
            return;
        }
    } else {
        title.innerText = 'إضافة طالب جديد';
        document.getElementById('student-modal-id').value = '';
        document.getElementById('student-modal-name').value = '';
        document.getElementById('student-modal-code').value = 'STUD-' + Math.floor(1000 + Math.random() * 9000);
        document.getElementById('student-modal-phone').value = '';
        document.getElementById('student-modal-notes').value = '';
    }

    modal.classList.add('active');
}

function closeStudentModal() {
    document.getElementById('student-modal').classList.remove('active');
}

async function saveStudentCRM() {
    const id = document.getElementById('student-modal-id').value;
    const name = document.getElementById('student-modal-name').value.trim();
    const code = document.getElementById('student-modal-code').value.trim();
    const phone = document.getElementById('student-modal-phone').value.trim();
    const notes = document.getElementById('student-modal-notes').value.trim();

    if (!name || !code || !phone) {
        showToast("warning", "يرجى تعبئة جميع الحقول المطلوبة!");
        return;
    }

    if (isDemoMode) {
        if (id) {
            // Update
            const s = studentsCache.find(x => x.id === id);
            s.full_name = name;
            s.reservation_code = code;
            s.phone_number = phone;
            s.notes = notes;
        } else {
            // Create
            studentsCache.push({
                id: 's-' + Math.random().toString(36).substr(2, 9),
                full_name: name,
                reservation_code: code,
                phone_number: phone,
                notes: notes
            });
        }
        localStorage.setItem('students', JSON.stringify(studentsCache));
        showToast("success", "تم حفظ بيانات الطالب بنجاح.");
        closeStudentModal();
        loadAdminStudentsCRM();

        writeSystemLog("student_crm_save", `تم حفظ الطالب: ${name} (${code})`);
    } else {
        supabaseClient.rpc('admin_save_student', {
            p_admin_user: loggedInAdmin.username,
            p_admin_pass_hash: loggedInAdmin.passHash,
            p_student_id: id || null,
            p_full_name: name,
            p_reservation_code: code,
            p_phone_number: phone,
            p_notes: notes || null
        }).then(async ({ error }) => {
            if (error) throw error;
            showToast("success", "تم حفظ بيانات الطالب بنجاح.");
            closeStudentModal();
            writeSystemLog("student_crm_save", `تم حفظ الطالب: ${name} (${code})`);
            await fetchSupabaseData();
        }).catch(err => {
            console.error("Save student failed:", err);
            showToast("error", "تعذر حفظ بيانات الطالب على الخادم.");
        });
    }
}

async function deleteStudentCRM(studentId) {
    if (!confirm("هل أنت متأكد من حذف هذا الطالب نهائياً من قاعدة البيانات؟")) return;

    if (isDemoMode) {
        studentsCache = studentsCache.filter(s => s.id !== studentId);
        localStorage.setItem('students', JSON.stringify(studentsCache));
        showToast("success", "تم حذف سجل الطالب بنجاح.");
        loadAdminStudentsCRM();

        writeSystemLog("student_crm_delete", `تم حذف معرف الطالب: ${studentId}`);
    } else {
        supabaseClient.rpc('admin_delete_student', {
            p_admin_user: loggedInAdmin.username,
            p_admin_pass_hash: loggedInAdmin.passHash,
            p_student_id: studentId
        }).then(async ({ error }) => {
            if (error) throw error;
            showToast("success", "تم حذف سجل الطالب بنجاح.");
            writeSystemLog("student_crm_delete", `تم حذف معرف الطالب: ${studentId}`);
            await fetchSupabaseData();
        }).catch(err => {
            console.error("Delete student failed:", err);
            showToast("error", "تعذر حذف الطالب على الخادم.");
        });
    }
}

// CSV Bulk Operations
function triggerCSVImport() {
    document.getElementById('csv-file-input').click();
}

function handleCSVImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const rows = text.split('\n');
        let importCount = 0;

        // Skip header row: Name,Code,Phone,Notes
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(',');
            if (cols.length >= 3) {
                const name = cols[0].trim();
                const code = cols[1].trim();
                const phone = cols[2].trim();
                const notes = cols[3] ? cols[3].trim() : '';

                if (name && code && phone) {
                    // Deduplicate or insert
                    const idx = studentsCache.findIndex(s => s.reservation_code === code);
                    if (idx !== -1) {
                        studentsCache[idx] = { id: studentsCache[idx].id, full_name: name, reservation_code: code, phone_number: phone, notes };
                    } else {
                        studentsCache.push({ id: 's-' + Math.random().toString(36).substr(2, 9), full_name: name, reservation_code: code, phone_number: phone, notes });
                    }
                    importCount++;
                }
            }
        }

        if (isDemoMode) {
            localStorage.setItem('students', JSON.stringify(studentsCache));
            loadAdminStudentsCRM();
            showToast("success", `تم استيراد وتحديث ${importCount} سجل للطلاب بنجاح.`);
            writeSystemLog("csv_import", `تم استيراد ${importCount} طالب عبر ملف CSV.`);
        } else {
            const payload = [];
            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i].split(',');
                if (cols.length >= 3) {
                    const name = cols[0].trim();
                    const code = cols[1].trim();
                    const phone = cols[2].trim();
                    const notes = cols[3] ? cols[3].trim() : '';
                    if (name && code && phone) {
                        payload.push({
                            full_name: name,
                            reservation_code: code,
                            phone_number: phone,
                            notes: notes || null
                        });
                    }
                }
            }

            supabaseClient.rpc('admin_bulk_import_students', {
                p_admin_user: loggedInAdmin.username,
                p_admin_pass_hash: loggedInAdmin.passHash,
                p_students_json: payload
            }).then(async ({ error }) => {
                if (error) throw error;
                showToast("success", `تم استيراد وتحديث ${payload.length} سجل للطلاب بنجاح.`);
                writeSystemLog("csv_import", `تم استيراد ${payload.length} طالب عبر ملف CSV.`);
                await fetchSupabaseData();
            }).catch(err => {
                console.error("CSV import failed:", err);
                showToast("error", "فشل استيراد CSV عبر الخادم.");
            });
        }
    };
    reader.readAsText(file);
}

function exportStudentsToCSV() {
    let csvContent = "data:text/csv;charset=utf-8,الاسم,رمز الحجز,الهاتف,ملاحظات\n";
    studentsCache.forEach(s => {
        csvContent += `${s.full_name},${s.reservation_code},${s.phone_number},${s.notes || ''}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ExamBus-Students-Export-${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("success", "تم تصدير ملف الطلاب كـ CSV.");
}

// --- SECTION C: BUS CRM ---
function loadAdminBusesCRM() {
    const tbody = document.getElementById('admin-buses-tbody');
    tbody.innerHTML = '';

    busesCache.forEach(bus => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${bus.name}</strong></td>
            <td>${bus.driver_name}</td>
            <td>${bus.driver_phone}</td>
            <td>${bus.departure_time}</td>
            <td>${bus.meeting_location}</td>
            <td><strong style="color:var(--accent)">${bus.capacity}</strong></td>
            <td><code>${bus.layout_template}</code></td>
            <td>
                <div style="display:flex; gap:5px;">
                    <button class="btn-outline" style="padding:4px 8px; font-size:0.75rem; color:var(--vip); border-color:var(--vip);" onclick="viewAdminBusSeats('${bus.id}')" title="عرض المقاعد"><i data-lucide="layout-grid"></i></button>
                    <button class="btn-outline" style="padding:4px 8px; font-size:0.75rem;" onclick="openBusModal('${bus.id}')"><i data-lucide="edit"></i></button>
                    <button class="btn-outline" style="padding:4px 8px; font-size:0.75rem; color:var(--danger); border-color:var(--danger)" onclick="deleteBusCRM('${bus.id}')"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function closeAdminBusSeatsModal() {
    document.getElementById('admin-bus-seats-modal').classList.remove('active');
}

async function viewAdminBusSeats(busId) {
    const bus = busesCache.find(b => b.id === busId);
    if (!bus) return;

    document.getElementById('admin-bus-seats-title').innerText = `مقاعد العربيه: ${bus.name}`;

    const grid = document.getElementById('admin-seating-layout-grid');
    grid.innerHTML = '';

    // Retrieve seats configured for this bus
    let seats = [];
    if (isDemoMode) {
        const allSeats = JSON.parse(localStorage.getItem('seats')) || [];
        seats = allSeats.filter(s => s.bus_id === busId);
        if (seats.length === 0) seats = generateDefaultSeatsForBus(busId, bus.capacity);
    } else {
        try {
            let { data } = await supabaseClient.from('seats').select('*').eq('bus_id', busId);
            if (data) seats = data;
        } catch (e) { console.error(e); }
    }

    if (seats.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1 / -1; text-align:center;">لا توجد مقاعد مهيئة لهذه العربيه.</p>';
    } else {
        let maxX = 0, maxY = 0;
        seats.forEach(s => {
            if (s.x_pos > maxX) maxX = s.x_pos;
            if (s.y_pos > maxY) maxY = s.y_pos;
        });

        grid.style.gridTemplateColumns = `repeat(${maxX + 1}, 1fr)`;

        let gridMap = {};
        seats.forEach(seat => {
            gridMap[`${seat.x_pos},${seat.y_pos}`] = seat;
        });

        // Get reservations for this bus
        const confirmedReservations = reservationsCache.filter(r => r.bus_id === busId && r.status === 'confirmed');

        for (let y = 0; y <= maxY; y++) {
            for (let x = 0; x <= maxX; x++) {
                const coord = `${x},${y}`;
                const seat = gridMap[coord];

                if (!seat) {
                    const empty = document.createElement('div');
                    empty.className = 'seat-placeholder';
                    grid.appendChild(empty);
                    continue;
                }

                const seatNode = document.createElement('div');
                seatNode.className = `seat-item ${seat.seat_type}-seat`;

                const res = confirmedReservations.find(r => r.seat_label === seat.seat_label);

                if (res) {
                    seatNode.classList.add('reserved');
                    const student = studentsCache.find(s => s.id === res.student_id);
                    const sName = student ? student.full_name.split(' ')[0] : 'محجوز';
                    seatNode.innerHTML = `
                        <span>${seat.seat_label}</span>
                        <span style="font-size: 0.55rem; color: #fff; background: rgba(0,0,0,0.5); padding: 1px 4px; border-radius: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90%;">${sName}</span>
                    `;
                } else if (seat.seat_type === 'driver') {
                    seatNode.classList.add('driver-seat');
                    seatNode.innerHTML = `<i data-lucide="circle-dot"></i><span style="font-size:0.65rem;">سائق</span>`;
                } else {
                    seatNode.classList.add('available');
                    seatNode.innerHTML = `
                        <span>${seat.seat_label}</span>
                        ${seat.seat_type === 'vip' ? '<i data-lucide="star" style="font-size:10px; color:#f59e0b; margin-top:2px;"></i>' : ''}
                    `;
                }
                grid.appendChild(seatNode);
            }
        }
        lucide.createIcons();
    }

    document.getElementById('admin-bus-seats-modal').classList.add('active');
}

function openBusModal(busId = '') {
    const modal = document.getElementById('bus-modal');
    const title = document.getElementById('bus-modal-title');

    if (busId) {
        title.innerText = 'تعديل بيانات عربيه';
        const b = busesCache.find(x => x.id === busId);
        document.getElementById('bus-modal-id').value = b.id;
        document.getElementById('bus-modal-name').value = b.name;
        document.getElementById('bus-modal-driver').value = b.driver_name;
        document.getElementById('bus-modal-phone').value = b.driver_phone;
        document.getElementById('bus-modal-time').value = b.departure_time;
        document.getElementById('bus-modal-loc').value = b.meeting_location;
        document.getElementById('bus-modal-capacity').value = b.capacity;
        document.getElementById('bus-modal-template').value = b.layout_template;
    } else {
        title.innerText = 'إضافة عربيه جديدة';
        document.getElementById('bus-modal-id').value = '';
        document.getElementById('bus-modal-name').value = '';
        document.getElementById('bus-modal-driver').value = '';
        document.getElementById('bus-modal-phone').value = '';
        document.getElementById('bus-modal-time').value = '07:30';
        document.getElementById('bus-modal-loc').value = '';
        document.getElementById('bus-modal-capacity').value = 14;
        document.getElementById('bus-modal-template').value = 'toyota_14';
    }

    modal.classList.add('active');
}

function closeBusModal() {
    document.getElementById('bus-modal').classList.remove('active');
}

async function saveBusCRM() {
    const id = document.getElementById('bus-modal-id').value;
    const name = document.getElementById('bus-modal-name').value.trim();
    const driver = document.getElementById('bus-modal-driver').value.trim();
    const phone = document.getElementById('bus-modal-phone').value.trim();
    const time = document.getElementById('bus-modal-time').value.trim();
    const loc = document.getElementById('bus-modal-loc').value.trim();
    const cap = Number(document.getElementById('bus-modal-capacity').value);
    const template = document.getElementById('bus-modal-template').value;

    if (!name || !driver || !phone || !time || !loc || !cap) {
        showToast("warning", "الرجاء ملء جميع الحقول المطلوبة!");
        return;
    }

    if (isDemoMode) {
        let generatedId = id;
        if (id) {
            const b = busesCache.find(x => x.id === id);
            b.name = name;
            b.driver_name = driver;
            b.driver_phone = phone;
            b.departure_time = time;
            b.meeting_location = loc;
            b.capacity = cap;
            b.layout_template = template;
        } else {
            generatedId = 'b-' + Math.random().toString(36).substr(2, 9);
            busesCache.push({
                id: generatedId, name, driver_name: driver, driver_phone: phone, departure_time: time, meeting_location: loc, capacity: cap, layout_template: template
            });
        }
        localStorage.setItem('buses', JSON.stringify(busesCache));

        // Initialize default seats templates for the newly created bus
        generateDefaultSeatsForBus(generatedId, cap);

        showToast("success", "تم حفظ بيانات العربيه والمقاعد بنجاح.");
        closeBusModal();
        loadAdminBusesCRM();
        loadBusesToLanding();
        loadDesignerBusesSelect();

        writeSystemLog("bus_crm_save", `تم حفظ عربيه: ${name}`);
    } else {
        supabaseClient.rpc('admin_save_bus', {
            p_admin_user: loggedInAdmin.username,
            p_admin_pass_hash: loggedInAdmin.passHash,
            p_bus_id: id || null,
            p_name: name,
            p_driver_name: driver,
            p_driver_phone: phone,
            p_departure_time: time,
            p_meeting_location: loc,
            p_capacity: cap,
            p_notes: null,
            p_layout_template: template
        }).then(async ({ data, error }) => {
            if (error) throw error;

            if (!id && data) {
                const defaultSeats = generateDefaultSeatsForBus(data, cap);
                const { error: seatError } = await supabaseClient.rpc('admin_save_bus_seats', {
                    p_admin_user: loggedInAdmin.username,
                    p_admin_pass_hash: loggedInAdmin.passHash,
                    p_bus_id: data,
                    p_seats_json: defaultSeats
                });
                if (seatError) throw seatError;
            }

            showToast("success", "تم حفظ بيانات العربيه بنجاح.");
            closeBusModal();
            writeSystemLog("bus_crm_save", `تم حفظ عربيه: ${name}`);
            await fetchSupabaseData();
        }).catch(err => {
            console.error("Save bus failed:", err);
            showToast("error", "تعذر حفظ بيانات العربيه على الخادم.");
        });
    }
}

async function deleteBusCRM(busId) {
    if (!confirm("حذف العربيه سيؤدي لحذف كافة المقاعد والحجوزات المرتبطة بها! هل أنت متأكد؟")) return;

    if (isDemoMode) {
        busesCache = busesCache.filter(b => b.id !== busId);
        localStorage.setItem('buses', JSON.stringify(busesCache));

        // Remove matching seats and reservations
        let seats = JSON.parse(localStorage.getItem('seats')) || [];
        seats = seats.filter(s => s.bus_id !== busId);
        localStorage.setItem('seats', JSON.stringify(seats));

        showToast("success", "تم حذف العربيه ومرفقاتها بنجاح.");
        loadAdminBusesCRM();
        loadBusesToLanding();
        loadDesignerBusesSelect();

        writeSystemLog("bus_crm_delete", `تم حذف معرف العربيه: ${busId}`);
    } else {
        supabaseClient.rpc('admin_delete_bus', {
            p_admin_user: loggedInAdmin.username,
            p_admin_pass_hash: loggedInAdmin.passHash,
            p_bus_id: busId
        }).then(async ({ error }) => {
            if (error) throw error;
            showToast("success", "تم حذف العربيه وملحقاتها بنجاح.");
            writeSystemLog("bus_crm_delete", `تم حذف معرف العربيه: ${busId}`);
            await fetchSupabaseData();
        }).catch(err => {
            console.error("Delete bus failed:", err);
            showToast("error", "تعذر حذف العربيه على الخادم.");
        });
    }
}

// --- SECTION D: CUSTOM VISUAL BUS DESIGNER ---
function loadDesignerBusesSelect() {
    const select = document.getElementById('designer-bus-select');
    select.innerHTML = '<option value="">-- اختر العربيه --</option>';
    busesCache.forEach(bus => {
        select.innerHTML += `<option value="${bus.id}">${bus.name} (${bus.capacity} مقعد)</option>`;
    });
}

function loadBusInDesigner() {
    const busId = document.getElementById('designer-bus-select').value;
    const canvas = document.getElementById('designer-grid-canvas');
    canvas.innerHTML = '';

    if (!busId) return;

    const allSeats = isDemoMode ? (JSON.parse(localStorage.getItem('seats')) || []) : seatsCache;
    designerSeats = allSeats.filter(s => s.bus_id === busId);

    // If empty, generate defaults
    if (designerSeats.length === 0) {
        const bus = busesCache.find(b => b.id === busId);
        designerSeats = generateDefaultSeatsForBus(busId, bus.capacity);
    }

    renderDesignerCanvas();
}

function renderDesignerCanvas() {
    const canvas = document.getElementById('designer-grid-canvas');
    canvas.innerHTML = '';

    // Layout is a grid: column x (0-4) and row y (0-9)
    // Draw grid cells
    const gridMap = {};
    designerSeats.forEach((seat, idx) => {
        gridMap[`${seat.x_pos},${seat.y_pos}`] = { seat, idx };
    });

    // Set grid templates
    canvas.style.gridTemplateColumns = 'repeat(5, 60px)';
    canvas.style.gridAutoRows = '60px';

    for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 5; x++) {
            const coord = `${x},${y}`;
            const node = gridMap[coord];

            const cell = document.createElement('div');
            cell.className = 'designer-grid-cell';
            cell.setAttribute('data-x', x);
            cell.setAttribute('data-y', y);

            // Allow dragging and drop actions
            cell.ondragover = e => e.preventDefault();
            cell.ondrop = e => handleDesignerDrop(e, x, y);
            cell.onclick = () => handleDesignerCellClick(x, y);

            if (node) {
                const seatNode = document.createElement('div');
                seatNode.className = `designer-seat ${node.seat.seat_type}`;
                seatNode.draggable = true;
                seatNode.innerHTML = `
                    <span>${node.seat.seat_label}</span>
                    <button class="remove-btn" onclick="removeSeatFromDesigner(event, ${node.idx})">x</button>
                `;

                // Drag events
                seatNode.ondragstart = e => {
                    e.dataTransfer.setData('text/plain', node.idx);
                };

                cell.appendChild(seatNode);
            }

            canvas.appendChild(cell);
        }
    }
}

function addSeatToDesigner() {
    const busId = document.getElementById('designer-bus-select').value;
    if (!busId) {
        showToast("warning", "الرجاء اختيار العربيه أولاً!");
        return;
    }

    const type = document.getElementById('designer-type-select').value;

    // Find first empty cell on grid
    let foundX = -1, foundY = -1;
    for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 5; x++) {
            const collision = designerSeats.some(s => s.x_pos === x && s.y_pos === y);
            if (!collision) {
                foundX = x;
                foundY = y;
                break;
            }
        }
        if (foundX !== -1) break;
    }

    if (foundX === -1) {
        showToast("error", "لا توجد خلايا فارغة متاحة في مخطط العربيه!");
        return;
    }

    const label = type === 'driver' ? 'Driver' : String(designerSeats.filter(s => s.seat_type !== 'driver').length + 1);

    designerSeats.push({
        bus_id: busId,
        seat_label: label,
        seat_type: type,
        x_pos: foundX,
        y_pos: foundY,
        is_active: true
    });

    renderDesignerCanvas();
    showToast("success", `تمت إضافة المقعد رقم ${label}`);
}

function handleDesignerDrop(e, targetX, targetY) {
    e.preventDefault();
    const seatIdx = parseInt(e.dataTransfer.getData('text/plain'));

    // Verify collision at destination
    const collision = designerSeats.some((s, idx) => s.x_pos === targetX && s.y_pos === targetY && idx !== seatIdx);
    if (collision) {
        showToast("warning", "هذه الخلية مشغولة بمقعد آخر!");
        return;
    }

    // Move seat node
    designerSeats[seatIdx].x_pos = targetX;
    designerSeats[seatIdx].y_pos = targetY;

    renderDesignerCanvas();
}

function removeSeatFromDesigner(e, idx) {
    e.stopPropagation();
    const label = designerSeats[idx].seat_label;
    designerSeats.splice(idx, 1);
    renderDesignerCanvas();
    showToast("info", `تم حذف المقعد ${label}`);
}

function handleDesignerCellClick(x, y) {
    // Can be used to toggle seat types or edit custom labels
    console.log(`Cell click coordinates: ${x}, ${y}`);
}

async function saveDesignerLayout() {
    const busId = document.getElementById('designer-bus-select').value;
    if (!busId) return;

    if (isDemoMode) {
        const allSeats = JSON.parse(localStorage.getItem('seats')) || [];
        const filtered = allSeats.filter(s => s.bus_id !== busId);

        const updated = [...filtered, ...designerSeats];
        localStorage.setItem('seats', JSON.stringify(updated));

        // Automatically adjust capacity count in bus table to match the count of seat nodes
        const activeCapacity = designerSeats.filter(s => s.seat_type !== 'driver').length;
        const bus = busesCache.find(b => b.id === busId);
        bus.capacity = activeCapacity;
        localStorage.setItem('buses', JSON.stringify(busesCache));

        showToast("success", `تم حفظ التغييرات وتحديث مخطط المقاعد بنجاح. السعة الجديدة: ${activeCapacity} مقاعد.`);
        writeSystemLog("designer_save", `تم إعادة تصميم وتحديث سعة العربيه ${bus.name} إلى ${activeCapacity} مقعد`);

        loadAdminBusesCRM();
        loadBusesToLanding();
    } else {
        const bus = busesCache.find(b => b.id === busId);
        if (!bus) {
            showToast("error", "لم يتم العثور على العربيه المحددة.");
            return;
        }

        const activeCapacity = designerSeats.filter(s => s.seat_type !== 'driver').length;
        supabaseClient.rpc('admin_save_bus', {
            p_admin_user: loggedInAdmin.username,
            p_admin_pass_hash: loggedInAdmin.passHash,
            p_bus_id: bus.id,
            p_name: bus.name,
            p_driver_name: bus.driver_name,
            p_driver_phone: bus.driver_phone,
            p_departure_time: bus.departure_time,
            p_meeting_location: bus.meeting_location,
            p_capacity: activeCapacity,
            p_notes: bus.notes || null,
            p_layout_template: bus.layout_template
        }).then(async ({ error }) => {
            if (error) throw error;

            const { error: seatError } = await supabaseClient.rpc('admin_save_bus_seats', {
                p_admin_user: loggedInAdmin.username,
                p_admin_pass_hash: loggedInAdmin.passHash,
                p_bus_id: bus.id,
                p_seats_json: designerSeats
            });
            if (seatError) throw seatError;

            showToast("success", `تم حفظ تصميم المقاعد بنجاح. السعة الجديدة: ${activeCapacity} مقاعد.`);
            writeSystemLog("designer_save", `تم إعادة تصميم وتحديث سعة العربيه ${bus.name} إلى ${activeCapacity} مقعد`);
            await fetchSupabaseData();
        }).catch(err => {
            console.error("Save designer failed:", err);
            showToast("error", "تعذر حفظ تصميم المقاعد على الخادم.");
        });
    }
}

// --- SECTION E: PRICING CRM ---
function loadAdminPricingForm() {
    document.getElementById('pr-going').value = pricingCache.going_price;
    document.getElementById('pr-return').value = pricingCache.return_price;
    document.getElementById('pr-round').value = pricingCache.round_trip_price;
    document.getElementById('pr-vip-fee').value = pricingCache.vip_seat_fee;
    document.getElementById('pr-front-fee').value = pricingCache.front_seat_fee;
}

async function saveSystemPricing() {
    const going = Number(document.getElementById('pr-going').value);
    const ret = Number(document.getElementById('pr-return').value);
    const round = Number(document.getElementById('pr-round').value);
    const vip = Number(document.getElementById('pr-vip-fee').value);
    const front = Number(document.getElementById('pr-front-fee').value);

    pricingCache = {
        going_price: going,
        return_price: ret,
        round_trip_price: round,
        vip_seat_fee: vip,
        front_seat_fee: front,
        discount_amount: 0.00
    };

    if (isDemoMode) {
        localStorage.setItem('pricing', JSON.stringify(pricingCache));
        showToast("success", "تم تحديث وحفظ قيم أسعار الرحلات بنجاح.");
        writeSystemLog("pricing_save", "تعديل جدول التسعير العام للرحلات.");
    } else {
        supabaseClient.rpc('admin_save_pricing', {
            p_admin_user: loggedInAdmin.username,
            p_admin_pass_hash: loggedInAdmin.passHash,
            p_prices_json: {
                going_price: going,
                return_price: ret,
                round_trip_price: round,
                vip_seat_fee: vip,
                front_seat_fee: front,
                discount_amount: 0.00
            }
        }).then(async ({ error }) => {
            if (error) throw error;
            showToast("success", "تم تحديث وحفظ قيم أسعار الرحلات بنجاح.");
            writeSystemLog("pricing_save", "تعديل جدول التسعير العام للرحلات.");
            await fetchSupabaseData();
        }).catch(err => {
            console.error("Save pricing failed:", err);
            showToast("error", "تعذر حفظ التسعير على الخادم.");
        });
    }
}

// --- SECTION F: QR CODE CAMERA CHECK-IN ATTENDANCE ---
let html5QrcodeScanner = null;

function startCameraQRScanner() {
    html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", {
        fps: 10,
        qrbox: 250,
        rememberLastUsedCamera: true
    });

    html5QrcodeScanner.render(onScanSuccess, onScanError);
}

function stopCameraQRScanner() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().then(() => {
            html5QrcodeScanner = null;
        }).catch(err => console.error(err));
    }
}

async function onScanSuccess(decodedText, decodedResult) {
    console.log(`Scan result: ${decodedText}`);
    // decodedText represents the reservation ID

    // Process checking attendance
    const res = reservationsCache.find(r => r.id === decodedText);

    if (res) {
        // Beep or Notify
        showToast("success", `تم التعرف على التذكرة بنجاح!`);

        // Add to attendance database
        if (isDemoMode) {
            let attendance = JSON.parse(localStorage.getItem('attendance')) || [];
            const duplicate = attendance.some(a => a.reservation_id === res.id);

            if (!duplicate) {
                attendance.push({
                    id: 'att-' + Math.random().toString(36).substr(2, 9),
                    reservation_id: res.id,
                    checked_in_at: new Date().toISOString(),
                    checked_in_by: loggedInAdmin.username
                });
                localStorage.setItem('attendance', JSON.stringify(attendance));
            }
        } else {
            supabaseClient.rpc('admin_checkin_student', {
                p_admin_user: loggedInAdmin.username,
                p_admin_pass_hash: loggedInAdmin.passHash,
                p_reservation_id: res.id
            }).then(async ({ error }) => {
                if (error) throw error;
                await fetchSupabaseData();
            }).catch(err => {
                console.error("Check-in failed:", err);
                showToast("error", "تعذر تسجيل حضور الطالب على الخادم.");
            });
        }

        // Retrieve Student and bus details
        const student = studentsCache.find(s => s.id === res.student_id);
        const bus = busesCache.find(b => b.id === res.bus_id);

        document.getElementById('scan-student-name').innerText = student ? student.full_name : 'طالب غير مسجل';
        document.getElementById('scan-bus-name').innerText = bus ? bus.name : '-';
        document.getElementById('scan-seat-num').innerText = res.seat_label || '-';
        document.getElementById('scan-type').innerText = res.reservation_type;
        document.getElementById('scan-checkin-time').innerText = new Date().toLocaleTimeString();

        document.getElementById('scanner-result-box').style.display = 'block';

        writeSystemLog("check_in", `تسجيل حضور الطالب: ${student ? student.full_name : ''} - المقعد: ${res.seat_label}`);
    } else {
        showToast("error", "تذكرة غير صالحة أو غير مسجلة في خوادم النظام!");
    }
}

function onScanError(errorMessage) {
    // silence scanning search reports
}
