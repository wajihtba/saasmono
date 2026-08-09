'use client'

import SignInForm from '@/components/sign-in-form'
import { Card, CardContent } from '@repo/ui'
import { ArrowRight, BookOpen, Calendar, GraduationCap, Users } from 'lucide-react'
import Image from 'next/image'

import Link from 'next/link'
import { useState } from 'react'

export default function LoginPage() {
  const [showSignIn, setShowSignIn] = useState(true)

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950"
      dir="rtl"
    >
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md dark:bg-gray-900/80">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <ArrowRight className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-600">العودة للرئيسية</span>
            </Link>
            <div className="flex items-center gap-3">
              <Image src="/logo-and-text.svg" alt="منارة" width={120} height={32} className="h-8" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-80px)]">
        {/* Left Side - Branding & Features */}
        <div className="relative hidden flex-col justify-center overflow-hidden bg-gradient-to-br from-blue-600 to-purple-700 px-12 text-white lg:flex lg:w-1/2">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 right-20 h-32 w-32 rounded-full border border-white/20"></div>
            <div className="absolute bottom-32 left-16 h-24 w-24 rounded-full border border-white/20"></div>
            <div className="absolute top-1/2 left-1/4 h-16 w-16 rounded-full border border-white/20"></div>
          </div>

          <div className="relative z-10 mr-auto max-w-lg">
            <h1 className="mb-6 text-right text-4xl leading-tight font-bold">
              أهلاً بك في
              <br />
              <span className="text-yellow-300">منصة منارة</span>
            </h1>
            <p className="mb-12 text-right text-xl leading-relaxed opacity-90">
              منصة متكاملة لإدارة المؤسسات التعليمية بأحدث التقنيات العالمية
            </p>

            <div className="space-y-6">
              {[
                {
                  icon: <GraduationCap className="h-6 w-6" />,
                  title: 'إدارة شاملة للطلاب',
                  description: 'متابعة الحضور والدرجات والسلوك الأكاديمي',
                },
                {
                  icon: <Users className="h-6 w-6" />,
                  title: 'تنظيم فريق التدريس',
                  description: 'إدارة المعلمين والموظفين بنظام صلاحيات متقدم',
                },
                {
                  icon: <BookOpen className="h-6 w-6" />,
                  title: 'مناهج تفاعلية',
                  description: 'أدوات تعليمية حديثة ومحتوى رقمي متطور',
                },
                {
                  icon: <Calendar className="h-6 w-6" />,
                  title: 'جدولة ذكية',
                  description: 'تنظيم الحصص والامتحانات تلقائياً',
                },
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">{feature.icon}</div>
                  <div className="text-right">
                    <h3 className="mb-1 font-semibold">{feature.title}</h3>
                    <p className="text-sm opacity-80">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-right">
                  <div className="text-2xl font-bold">99.9%</div>
                  <div className="text-sm opacity-80">وقت التشغيل</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">100+</div>
                  <div className="text-sm opacity-80">مؤسسة تعليمية</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">50k+</div>
                  <div className="text-sm opacity-80">مستخدم نشط</div>
                </div>
              </div>
              <p className="text-right text-sm opacity-80">✨ منصة موثوقة من قبل أفضل المؤسسات التعليمية في المنطقة</p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
          <div className="w-full max-w-md">
            <Card className="border-0 bg-white/80 shadow-2xl backdrop-blur-sm dark:bg-gray-900/80">
              <CardContent className="p-8">
                <div className="mb-8 text-center">
                  <div className="mb-4 lg:hidden">
                    <Image src="/logo-and-text.svg" alt="منارة" width={150} height={40} className="mx-auto h-10" />
                  </div>
                  <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                    {showSignIn ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {showSignIn ? 'أدخل بياناتك للوصول إلى حسابك' : 'انضم إلى منصة منارة واكتشف مستقبل التعليم الرقمي'}
                  </p>
                </div>

                <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
                {/*{showSignIn ? (
                  <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
                ) : (
                  <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
                )}*/}
              </CardContent>
            </Card>

            {/* Mobile Features Preview */}
            <div className="mt-8 lg:hidden">
              <Card className="border-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <CardContent className="p-6 text-center">
                  <h3 className="mb-3 font-bold">لماذا منصة منارة؟</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <GraduationCap className="mx-auto mb-2 h-6 w-6" />
                      <div>إدارة الطلاب</div>
                    </div>
                    <div>
                      <Users className="mx-auto mb-2 h-6 w-6" />
                      <div>إدارة المعلمين</div>
                    </div>
                    <div>
                      <BookOpen className="mx-auto mb-2 h-6 w-6" />
                      <div>المناهج الرقمية</div>
                    </div>
                    <div>
                      <Calendar className="mx-auto mb-2 h-6 w-6" />
                      <div>الجدولة الذكية</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
