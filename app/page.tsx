'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, Suspense, useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useFormStore } from '@/store/formStore';

function HomeContent() {
  const searchParams = useSearchParams();
  const { setPromoCode } = useFormStore();
  const [promoValidating, setPromoValidating] = useState(false);
  
  // Extract promo code from URL and validate via API
  useEffect(() => {
    async function validateAndSetPromo() {
      const urlPromoCode = searchParams.get('promocode');
      if (urlPromoCode) {
        setPromoValidating(true);
        try {
          const response = await fetch(`/api/promo/validate?code=${encodeURIComponent(urlPromoCode)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.valid) {
              setPromoCode(data.code);
            }
          }
        } catch (err) {
          console.error('Error validating promo code:', err);
        } finally {
          setPromoValidating(false);
        }
      }
    }
    
    validateAndSetPromo();
  }, [searchParams, setPromoCode]);

  return (
    <>
      <Navigation />
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative flex flex-col justify-center items-center text-center px-5 overflow-hidden mt-24 h-[calc(100vh-6rem)]">
        <Image
          src="/storage/hero.jpg"
          alt="FitFlow активна жена"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#023047]/40 to-[#FB7D00]/35 z-10" />

        <div className="relative z-20 max-w-[90%]">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg tracking-wide text-left">
            <p className='pb-2 md:pb-3'>Кутия за</p>
            <p>АКТИВНИ дами</p>
          </h1>
          <p className="text-sm md:text-2xl font-extrabold text-[#FFD700] mb-4 uppercase tracking-[3px] text-left drop-shadow-[0_0_20px_rgba(255,215,0,0.8)] animate-pulse">
            ПРЕДВАРИТЕЛНА ПОРЪЧКА
          </p>
          <p className="text-base md:text-xl text-white mb-8 drop-shadow-md text-left">
            Спортно облекло, аксесоари, протеинови продукти, добавки и мотивация на едно място
          </p>
          <Link href="/step-1">
            <button className="bg-[#FB7D00] text-white px-10 py-4 rounded-full text-lg font-semibold uppercase tracking-wide shadow-lg hover:bg-[#e67100] transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0">
              Запиши се сега
            </button>
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-5 bg-gradient-to-b from-white to-gray-50">
        <h2 className="text-3xl md:text-4xl font-bold text-[#023047] text-center mb-12 relative after:content-[''] after:block after:w-16 after:h-1 after:bg-[#FB7D00] after:mx-auto after:mt-4 after:rounded">
          Как работи
        </h2>
        <div className="max-w-lg mx-auto space-y-8">
          {[
            { num: 1, title: 'Избери честота', desc: 'Избери колко често искаш да получаваш своята кутия' },
            { num: 2, title: 'Персонализирай', desc: 'Отговори на въпросник за персонализация или остави изненадата на нас' },
            { num: 3, title: 'Завърши', desc: 'Попълни личните си данни и се присъедини към списъка с предварителни поръчки' }
          ].map((step) => (
            <div key={step.num} className="relative bg-white p-8 rounded-2xl shadow-lg border-l-4 border-[#FB7D00] hover:-translate-y-1 hover:shadow-xl transition-all">
              <div className="absolute -top-4 left-5 w-12 h-12 bg-[#FB7D00] text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                {step.num}
              </div>
              <div className="mt-4">
                <h3 className="text-xl font-semibold text-[#023047] mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What's Inside */}
      <section className="py-16 px-5 bg-white">
        <h2 className="text-3xl md:text-4xl font-bold text-[#023047] text-center mb-12 relative after:content-[''] after:block after:w-16 after:h-1 after:bg-[#FB7D00] after:mx-auto after:mt-4 after:rounded">
          Какво има в кутията?
        </h2>
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { img: 'protein  nameless.png', title: 'Протеинови продукти', desc: 'Протеинови продукти за подсилване преди и след тренировка', gradient: 'from-[#FB7D00] to-[#ff9a3d]' },
            { img: 'botttle no brand.png', title: 'Спортни аксесоари', desc: 'Спортни аксесоари за по-лесни и интересни тренировки', gradient: 'from-[#8ECAE6] to-[#5ab4db]' },
            { img: 'supplement no brand.png', title: 'Добавки', desc: 'Хранителни добавки за здрав дух и здраво тяло', gradient: 'from-[#023047] to-[#045a7f]' },
            { img: 'sports bra no logo 2.png', title: 'Спортно облекло', desc: 'Клин, спортен сутиен, тениска и др.', gradient: 'from-[#FB7D00] to-[#ff9a3d]' }
          ].map((product, idx) => (
            <div key={idx} className="bg-white p-8 rounded-2xl shadow-lg text-center hover:-translate-y-1 hover:shadow-xl transition-all border-2 border-transparent hover:border-[#FB7D00]">
              <div className="relative w-32 h-32 mx-auto mb-5">
                <div className={`absolute inset-0 bg-gradient-to-br ${product.gradient} opacity-15 rounded-2xl`} />
                <Image
                  src={`/storage/${product.img}`}
                  alt={product.title}
                  fill
                  className="object-contain relative z-10"
                />
              </div>
              <h3 className="text-xl font-bold text-[#023047] mb-2">{product.title}</h3>
              <p className="text-gray-600 text-sm">{product.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link href="/step-1">
            <button className="bg-[#023047] text-white px-9 py-3.5 rounded-full text-base font-semibold uppercase tracking-wide shadow-lg hover:bg-[#034561] transition-all hover:-translate-y-0.5 hover:shadow-xl">
              Започни сега
            </button>
          </Link>
        </div>
      </section>

      {/* Quotes */}
      <section className="py-16 px-5 bg-gradient-to-br from-[#023047] to-[#045a7f]">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12 relative after:content-[''] after:block after:w-16 after:h-1 after:bg-[#FB7D00] after:mx-auto after:mt-4 after:rounded">
          Вдъхновение
        </h2>
        <div className="max-w-4xl mx-auto space-y-10">
          {[
            { text: 'Най-трудно е решението да се действа,<br/>останалото е просто упоритост.', author: 'Амелия Еърхарт' },
            { text: 'Упражненията са ключът не само към физическото здраве,<br/>но и към душевното спокойствие.', author: 'Нелсън Мандела' },
            { text: 'Не спираме да тренираме, защото остаряваме.<br/>Остаряваме, защото спираме да тренираме.', author: 'Д-р Кенет Купър' }
          ].map((quote, idx) => (
            <div key={idx} className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border-l-4 border-[#FB7D00] hover:-translate-y-1 hover:bg-white/15 hover:shadow-2xl transition-all text-center">
              <p className="text-lg md:text-xl italic text-white leading-relaxed mb-4 max-w-2xl mx-auto">
                <span className="text-5xl text-[#FB7D00] leading-none mr-1">&quot;</span>
                <span dangerouslySetInnerHTML={{ __html: quote.text }} />
              </p>
              <p className="text-base font-semibold text-white">
                <span className="text-[#FB7D00]">— </span>{quote.author}
              </p>
            </div>
          ))}
        </div>
      </section>
      </div>
      <Footer />
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FB7D00]"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
