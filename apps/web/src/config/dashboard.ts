import type { Route } from 'next'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpen,
  BookUser,
  Calendar,
  CheckSquare,
  Database,
  FileText,
  FileType,
  Folder,
  GraduationCap,
  Heart,
  HelpCircle,
  LayoutDashboard,
  List,
  Plus,
  Search,
  Settings,
  Ticket,
  Users,
} from 'lucide-react'

export const dashboardSidebarData = {
  navMain: [
    {
      title: 'لوحة التحكم',
      url: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'الأقسام',
      url: '/dashboard/classrooms',
      icon: List,
    },
    {
      title: 'جدول الحصص',
      url: '/dashboard/timetable',
      icon: Calendar,
    },
    {
      title: 'كراس القسم',
      url: '/dashboard/session-notes',
      icon: BookOpen,
    },
    {
      title: 'سجلات الحضور',
      url: '/dashboard/attendances',
      icon: CheckSquare,
    },
    {
      title: 'تذاكر الدخول',
      url: '/dashboard/late-pass-tickets',
      icon: Ticket,
    },
    {
      title: 'المعلمون',
      url: '/dashboard/institution-settings/teachers',
      icon: Users,
    },
    {
      title: 'الطلاب',
      url: '/dashboard/institution-settings/students',
      icon: Users,
    },
    {
      title: 'أولياء الأمور',
      url: '/dashboard/institution-settings/parents',
      icon: Heart,
    },
    {
      title: 'المناهج',
      url: '/dashboard/institution-settings/curriculum',
      icon: Folder,
    },
  ],
  navClouds: [],
  navSecondary: [
    {
      title: 'الإعدادات',
      url: '/dashboard/user/settings',
      icon: Settings,
    },
    {
      title: 'المساعدة',
      url: '#',
      icon: HelpCircle,
    },
    {
      title: 'البحث',
      url: '#',
      icon: Search,
    },
  ],
  documents: [
    {
      name: 'مكتبة البيانات',
      url: '#',
      icon: Database,
    },
    {
      name: 'التقارير',
      url: '#',
      icon: BarChart3,
    },
    {
      name: 'الوثائق',
      url: '#',
      icon: FileType,
    },
  ],
}

// Keep the old format for backward compatibility
export const dashboardSidebarSections = [
  {
    title: 'القائمة الرئيسية',
    items: [
      {
        title: 'لوحة التحكم',
        icon: LayoutDashboard,
        url: '/dashboard',
      },
      {
        title: 'الأقسام',
        icon: GraduationCap,
        url: '/dashboard/classrooms',
      },
      {
        title: 'جدول الحصص',
        icon: Calendar,
        url: '/dashboard/timetable',
      },
    ],
  },
  {
    title: 'إعدادات المؤسسة ',
    items: [
      {
        title: 'المستويات والمواد',
        url: '/dashboard/institution-settings/curriculum',
        icon: BookOpen,
      },
      {
        title: 'قائمة الأساتذة',
        icon: BookUser,
        url: '/dashboard/institution-settings/teachers',
      },
      {
        title: 'قائمة الطلاب',
        icon: BookUser,
        url: '/dashboard/institution-settings/students',
      },
      {
        title: 'قائمة أولياء الأمور',
        icon: Heart,
        url: '/dashboard/institution-settings/parents',
      },
    ],
  },
]

export const dashboardNotifications = [
  {
    id: '1',
    title: 'طالب جديد',
    message: 'تم تسجيل طالب جديد في الصف الثالث الابتدائي',
    time: 'منذ 5 دقائق',
    isRead: false,
    type: 'info' as const,
  },
  {
    id: '2',
    title: 'اجتماع الأساتذة',
    message: 'اجتماع طاقم التدريس اليوم الساعة 2:00 مساءً',
    time: 'منذ ساعة',
    isRead: false,
    type: 'warning' as const,
  },
  {
    id: '3',
    title: 'نتائج الامتحانات',
    message: 'تم رفع نتائج امتحانات الفصل الأول',
    time: 'منذ يومين',
    isRead: true,
    type: 'success' as const,
  },
]

export const dashboardUser = {
  name: 'أحمد محمد',
  email: 'ahmed@school.edu.sa',
  avatar: '/avatars/teacher.jpg',
  initials: 'أم',
}

interface QuickActionLink {
  id: string
  title: string
  href: Route
  icon: LucideIcon
}

/**
 * Shortcuts on the dashboard landing page. Every entry points at a real route
 * so the role filter is the same one the sidebar and the page guard use.
 */
export const dashboardQuickActions: QuickActionLink[] = [
  {
    id: 'students',
    title: 'إدارة الطلاب',
    href: '/dashboard/institution-settings/students',
    icon: GraduationCap,
  },
  {
    id: 'take-attendance',
    title: 'تسجيل حضور',
    href: '/dashboard/attendances/new',
    icon: CheckSquare,
  },
  {
    id: 'new-note',
    title: 'ملاحظة جديدة',
    href: '/dashboard/session-notes/new',
    icon: BookOpen,
  },
  {
    id: 'late-pass',
    title: 'إصدار تصريح تأخير',
    href: '/dashboard/late-pass-tickets/generate',
    icon: Ticket,
  },
]

// Mobile Navigation Configuration
export const dashboardMobileNavItems = [
  {
    title: 'الرئيسية',
    href: '',
    icon: LayoutDashboard,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'الأقسام',
    href: 'classrooms',
    icon: GraduationCap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'جدول الحصص',
    href: 'timetable',
    icon: Calendar,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  {
    title: 'كراس القسم',
    href: 'session-notes',
    icon: BookOpen,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    title: 'سجلات الحضور',
    href: 'attendances',
    icon: CheckSquare,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  {
    title: 'تذاكر الدخول',
    href: 'late-pass-tickets',
    icon: Ticket,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
  },
  {
    title: 'المعلمون',
    href: 'institution-settings/teachers',
    icon: BookUser,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    title: 'الطلاب',
    href: 'institution-settings/students',
    icon: Users,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  {
    title: 'أولياء الأمور',
    href: 'institution-settings/parents',
    icon: Heart,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50'
  },
  {
    title: 'المناهج',
    href: 'institution-settings/curriculum',
    icon: BookOpen,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
]

/** Drawer shortcuts. `href` drives both the role filter and the navigation. */
export const dashboardMobileQuickActions: Array<{
  title: string
  icon: LucideIcon
  action: string
  href: Route
  color: string
}> = [
  {
    title: 'إضافة طالب',
    icon: Plus,
    action: 'add-student',
    href: '/dashboard/institution-settings/students',
    color: 'bg-blue-600 text-white',
  },
  {
    title: 'تسجيل حضور',
    icon: CheckSquare,
    action: 'take-attendance',
    href: '/dashboard/attendances/new',
    color: 'bg-green-600 text-white',
  },
  {
    title: 'تصريح تأخير',
    icon: Ticket,
    action: 'late-pass',
    href: '/dashboard/late-pass-tickets/generate',
    color: 'bg-purple-600 text-white',
  },
]

export const dashboardMobileDrawerItems = [
  {
    category: 'إدارة المؤسسة',
    items: [
      {
        title: 'الطلاب',
        href: 'institution-settings/students',
        icon: Users,
        description: 'إدارة ملفات الطلاب',
      },
      {
        title: 'تذاكر الدخول',
        href: 'late-pass-tickets',
        icon: Ticket,
        description: 'إصدار وإدارة تذاكر الدخول للطلاب المتغيبين',
      },
      {
        title: 'التقارير',
        href: 'reports',
        icon: FileText,
        description: 'التقارير والإحصائيات',
      },
    ],
  },
  {
    category: 'الإعدادات',
    items: [
      {
        title: 'إعدادات المدرسة',
        href: 'settings',
        icon: Settings,
        description: 'الإعدادات العامة للمؤسسة',
      },
    ],
  },
]
