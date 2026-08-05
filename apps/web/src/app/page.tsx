// Imported by file rather than from the package barrel: this page is a Server
// Component, and the barrel would drag client-only components into the RSC graph.
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle,
  FileText,
  Globe,
  GraduationCap,
  School,
  Shield,
  Star,
  Users,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950"
      dir="rtl"
    >
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md dark:bg-gray-900/80">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/logo-and-text.svg" alt="منارة" width={150} height={40} className="h-10" />
            </div>
            <div className="hidden items-center gap-8 md:flex">
              <a href="#features" className="hover:text-primary text-gray-600 transition-colors">
                المميزات
              </a>
              <a href="#about" className="hover:text-primary text-gray-600 transition-colors">
                عن المنصة
              </a>
              <a href="#pricing" className="hover:text-primary text-gray-600 transition-colors">
                الأسعار
              </a>
              <a href="#contact" className="hover:text-primary text-gray-600 transition-colors">
                تواصل معنا
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild>
                <Link href="/login">تسجيل الدخول</Link>
              </Button>
              {/*<Button>ابدأ مجاناً</Button>*/}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-8 text-center lg:text-right">
              <div className="space-y-4">
                <Badge className="px-4 py-2 text-sm">منصة إدارة المدارس الذكية</Badge>
                <h1 className="text-5xl leading-tight font-bold md:text-6xl">
                  نحو تعليم
                  <span className="bg-gradient-to-l from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {' '}
                    رقمي{' '}
                  </span>
                  متطور
                </h1>
                <p className="max-w-2xl text-xl leading-relaxed text-gray-600 dark:text-gray-300">
                  منصة شاملة لإدارة المؤسسات التعليمية من الروضة إلى التعليم العالي. تقنيات حديثة لتطوير التعليم وتسهيل
                  الإدارة.
                </p>
              </div>
              <div className="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                <Button size="lg" className="px-8 py-6 text-lg">
                  <ArrowLeft className="ml-2 h-5 w-5" />
                  ابدأ التجربة المجانية
                </Button>
                <Button variant="outline" size="lg" className="px-8 py-6 text-lg">
                  <Globe className="ml-2 h-5 w-5" />
                  مشاهدة العرض التوضيحي
                </Button>
              </div>
              <div className="flex items-center justify-center gap-8 lg:justify-start">
                <div className="text-center">
                  <div className="text-primary text-2xl font-bold">١٠٠+</div>
                  <div className="text-sm text-gray-600">مؤسسة تعليمية</div>
                </div>
                <div className="text-center">
                  <div className="text-primary text-2xl font-bold">٥٠,٠٠٠+</div>
                  <div className="text-sm text-gray-600">طالب وطالبة</div>
                </div>
                <div className="text-center">
                  <div className="text-primary text-2xl font-bold">٩٩.٩%</div>
                  <div className="text-sm text-gray-600">وقت التشغيل</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="relative z-10 rotate-3 transform rounded-2xl bg-white p-6 shadow-2xl transition-transform duration-300 hover:rotate-0 dark:bg-gray-900">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
                    <GraduationCap className="h-6 w-6 text-blue-600" />
                    <span className="font-medium">لوحة تحكم الطلاب</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3 dark:bg-green-950">
                    <Users className="h-6 w-6 text-green-600" />
                    <span className="font-medium">إدارة المعلمين</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-purple-50 p-3 dark:bg-purple-950">
                    <BookOpen className="h-6 w-6 text-purple-600" />
                    <span className="font-medium">المناهج الدراسية</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-orange-50 p-3 dark:bg-orange-950">
                    <Calendar className="h-6 w-6 text-orange-600" />
                    <span className="font-medium">الجدول الزمني</span>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 -rotate-6 transform rounded-2xl bg-gradient-to-br from-blue-400 to-purple-600 opacity-20"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white px-6 py-20 dark:bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold">مميزات منصة منارة</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              حلول متكاملة لجميع احتياجات إدارة المؤسسات التعليمية
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <GraduationCap className="h-8 w-8" />,
                title: 'إدارة الطلاب',
                description: 'نظام شامل لإدارة بيانات الطلاب، الحضور، والدرجات',
                color: 'blue',
              },
              {
                icon: <Users className="h-8 w-8" />,
                title: 'إدارة الموظفين',
                description: 'تنظيم بيانات المعلمين والموظفين مع نظام الصلاحيات',
                color: 'green',
              },
              {
                icon: <BookOpen className="h-8 w-8" />,
                title: 'المناهج والمواد',
                description: 'إدارة المناهج الدراسية والمواد التعليمية بسهولة',
                color: 'purple',
              },
              {
                icon: <Calendar className="h-8 w-8" />,
                title: 'الجدولة الذكية',
                description: 'إنشاء الجداول الدراسية تلقائياً مع تجنب التعارضات',
                color: 'orange',
              },
              {
                icon: <BarChart3 className="h-8 w-8" />,
                title: 'التقارير والتحليلات',
                description: 'تقارير شاملة ورؤى تحليلية لتحسين الأداء',
                color: 'red',
              },
              {
                icon: <Shield className="h-8 w-8" />,
                title: 'الأمان والخصوصية',
                description: 'حماية عالية لبيانات المؤسسة والطلاب',
                color: 'indigo',
              },
            ].map((feature, index) => (
              <Card key={index} className="group border-0 shadow-lg transition-all duration-300 hover:shadow-xl">
                <CardHeader>
                  <div
                    className={`h-16 w-16 rounded-2xl bg-${feature.color}-100 dark:bg-${feature.color}-950 flex items-center justify-center text-${feature.color}-600 transition-transform duration-300 group-hover:scale-110`}
                  >
                    {feature.icon}
                  </div>
                  <CardTitle className="text-right">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-right leading-relaxed text-gray-600 dark:text-gray-300">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Institution Levels */}
      <section className="bg-gradient-to-l from-blue-50 to-purple-50 px-6 py-20 dark:from-blue-950 dark:to-purple-950">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold">يدعم جميع المراحل التعليمية</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              من الروضة إلى التعليم العالي، نوفر حلولاً مخصصة لكل مرحلة
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-5">
            {[
              { name: 'الروضة', nameEn: 'JARDIN', icon: '🧸' },
              { name: 'الابتدائي', nameEn: 'PRIMAIRE', icon: '📚' },
              { name: 'الإعدادي', nameEn: 'COLLEGE', icon: '🔬' },
              { name: 'الثانوي', nameEn: 'SECONDAIRE', icon: '🎓' },
              { name: 'العالي', nameEn: 'SUPERIEUR', icon: '🏛️' },
            ].map((level, index) => (
              <Card key={index} className="border-2 text-center transition-transform duration-300 hover:scale-105">
                <CardContent className="pt-6">
                  <div className="mb-4 text-4xl">{level.icon}</div>
                  <h3 className="mb-2 text-lg font-bold">{level.name}</h3>
                  <p className="text-sm text-gray-500">{level.nameEn}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-white px-6 py-20 dark:bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-8 text-right text-4xl font-bold">لماذا منصة منارة؟</h2>
              <div className="space-y-6">
                {[
                  {
                    title: 'سهولة الاستخدام',
                    description: 'واجهة مستخدم بديهية ومصممة خصيصاً للبيئة العربية',
                  },
                  {
                    title: 'دعم فني متميز',
                    description: 'فريق دعم محلي متاح ٢٤/٧ لمساعدتك في أي وقت',
                  },
                  {
                    title: 'تحديثات مستمرة',
                    description: 'نطور المنصة باستمرار لتواكب أحدث المعايير التعليمية',
                  },
                  {
                    title: 'أمان البيانات',
                    description: 'حماية متقدمة لبيانات المؤسسة مع نسخ احتياطية منتظمة',
                  },
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <CheckCircle className="mt-1 h-6 w-6 flex-shrink-0 text-green-500" />
                    <div className="text-right">
                      <h3 className="mb-2 font-semibold">{item.title}</h3>
                      <p className="text-gray-600 dark:text-gray-300">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-8 text-white">
                <School className="mb-6 h-16 w-16" />
                <h3 className="mb-4 text-2xl font-bold">انضم إلى آلاف المؤسسات</h3>
                <p className="mb-6">التي تثق في منصة منارة لإدارة أعمالها التعليمية بكفاءة وفعالية</p>
                <div className="mb-4 flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="mr-2">٤.٩ من ٥</span>
                </div>
                <p className="text-sm opacity-90">تقييم أكثر من ١٠٠٠ مؤسسة تعليمية</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-l from-blue-600 to-purple-600 px-6 py-20 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-4xl font-bold">ابدأ رحلتك نحو التعليم الرقمي اليوم</h2>
          <p className="mb-8 text-xl opacity-90">انضم إلى منصة منارة واكتشف كيف يمكن أن تحول إدارة مؤسستك التعليمية</p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button size="lg" variant="secondary" className="px-8 py-6 text-lg">
              <FileText className="ml-2 h-5 w-5" />
              احجز عرضاً توضيحياً
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white px-8 py-6 text-lg text-white hover:bg-white hover:text-purple-600"
            >
              ابدأ التجربة المجانية لمدة ٣٠ يوماً
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 px-6 py-12 text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="text-right">
              <div className="mb-4 flex items-center justify-end gap-3">
                <span className="text-2xl font-bold">منارة</span>
                <Image src="/logo.svg" alt="منارة" width={32} height={32} className="h-8 w-8" />
              </div>
              <p className="leading-relaxed text-gray-400">منصة شاملة لإدارة المؤسسات التعليمية بأحدث التقنيات</p>
            </div>
            <div className="text-right">
              <h3 className="mb-4 font-semibold">المنتجات</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    إدارة الطلاب
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    إدارة المعلمين
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    النظام المالي
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    التقارير
                  </a>
                </li>
              </ul>
            </div>
            <div className="text-right">
              <h3 className="mb-4 font-semibold">الدعم</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    مركز المساعدة
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    الدروس التعليمية
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    الأسئلة الشائعة
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    تواصل معنا
                  </a>
                </li>
              </ul>
            </div>
            <div className="text-right">
              <h3 className="mb-4 font-semibold">الشركة</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    عن منارة
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    المدونة
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    الوظائف
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-white">
                    الشراكات
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; ٢٠٢٤ منصة منارة. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
