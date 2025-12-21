import Image from 'next/image';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function AboutPage() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-[#b3e0f7] via-[#d4ebf7] via-[#fde8d5] to-[#fcd5a8] pt-24 pb-16 px-5">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-[#023047] text-center mb-12 md:mb-16 relative after:content-[''] after:block after:w-16 after:h-1 after:bg-[#FB7D00] after:mx-auto after:mt-4 after:rounded">
            За нас
          </h1>

          {/* Mobile Layout */}
          <div className="flex flex-col items-center gap-8 md:hidden">
            {/* Photo - about.jpg */}
            <div className="w-full max-w-sm">
              <div className="bg-gradient-to-br from-[#FB7D00] to-[#ff9a3d] rounded-3xl shadow-2xl overflow-hidden">
                <Image 
                  src="/storage/about.jpg" 
                  alt="Симона от FitFlow" 
                  width={400}
                  height={500}
                  className="w-full h-auto"
                />
              </div>
            </div>

            {/* Story Content */}
            <div className="space-y-6">
              <p className="text-base leading-relaxed text-[#333] font-semibold">
                Аз съм Симона и спортът е моята страст още от дете. Занимавам се с баскетбол, фитнес, а отскоро и с йога. Спортът ми е дал изключително много - физическа и психическа сила, увереност, дисциплина, баланс и възможността да бъда национален състезател. Но знам, че има моменти, когато мотивацията просто липсва.
              </p>

              <p className="text-base leading-relaxed text-[#333] font-semibold">
                И точно тогава се роди идеята за <span className="text-[#FB7D00] font-bold">FitFlow</span> - спортна абонаментна кутия за активни жени, пълна с полезни продукти и предизвикателства, които да ни напомнят защо започнахме и защо не трябва да спираме. Тя e начин да се чувстваме вдъхновени, да сме активни и да се грижим за себе си с удоволствие.
              </p>

              <p className="text-base leading-relaxed text-[#333] font-semibold">
                Идеята за <span className="text-[#FB7D00] font-bold">FitFlow</span> идва от един човек, но зад развитието ѝ стоят много. Това са хора, които вярват в нея – специалисти, професионалисти и близки. Те помагат със знания, опит и различни гледни точки. Може да не са пред камерата, но са неразделна част от това, което <span className="text-[#FB7D00] font-bold">FitFlow</span> представлява.
              </p>

              <div className="border-l-4 border-[#FB7D00] pl-5 my-8">
                <p className="text-lg italic text-[#333] leading-relaxed mb-2">
                  &quot;Най-трудно е решението да се действа, останалото е просто упоритост.&quot;
                </p>
                <p className="text-base font-semibold text-[#666]">
                  — Амелия Еърхарт
                </p>
              </div>
              <p className="text-base text-[#333] mt-6 font-semibold text-right">
                От екипа на FitFlow
              </p>
            </div>

            {/* Photo - national-team.jpg */}
            <div className="w-full max-w-sm">
              <div className="bg-gradient-to-br from-[#FB7D00] to-[#ff9a3d] rounded-3xl shadow-2xl overflow-hidden">
                <Image 
                  src="/storage/national-team.jpg" 
                  alt="Национален отбор" 
                  width={400}
                  height={500}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>

          {/* Desktop Layout - Text wraps around images */}
          <div className="hidden md:block">
            {/* Top Right Photo - about.jpg */}
            <div className="float-right ml-8 mb-6 w-72 lg:w-80">
              <div className="bg-gradient-to-br from-[#FB7D00] to-[#ff9a3d] rounded-3xl shadow-2xl overflow-hidden">
                <Image 
                  src="/storage/about.jpg" 
                  alt="Симона от FitFlow" 
                  width={400}
                  height={500}
                  className="w-full h-auto"
                />
              </div>
            </div>

            <p className="text-lg leading-relaxed text-[#333] font-semibold mb-6">
              Аз съм Симона и спортът е моята страст още от дете. Занимавам се с баскетбол, фитнес, а отскоро и с йога. Спортът ми е дал изключително много - физическа и психическа сила, увереност, дисциплина, баланс и възможността да бъда национален състезател. Но знам, че има моменти, когато мотивацията просто липсва.
            </p>

            <p className="text-lg leading-relaxed text-[#333] font-semibold mb-6">
              И точно тогава се роди идеята за <span className="text-[#FB7D00] font-bold">FitFlow</span> - спортна абонаментна кутия за активни жени, пълна с полезни продукти и предизвикателства, които да ни напомнят защо започнахме и защо не трябва да спираме. Тя e начин да се чувстваме вдъхновени, да сме активни и да се грижим за себе си с удоволствие.
            </p>

            {/* Bottom Left Photo - national-team.jpg */}
            <div className="float-left mr-8 mb-6 w-72 lg:w-80">
              <div className="bg-gradient-to-br from-[#FB7D00] to-[#ff9a3d] rounded-3xl shadow-2xl overflow-hidden">
                <Image 
                  src="/storage/national-team.jpg" 
                  alt="Национален отбор" 
                  width={400}
                  height={500}
                  className="w-full h-auto"
                />
              </div>
            </div>

            <p className="text-lg leading-relaxed text-[#333] font-semibold mb-6">
              Идеята за <span className="text-[#FB7D00] font-bold">FitFlow</span> идва от един човек, но зад развитието ѝ стоят много. Това са хора, които вярват в нея – специалисти, професионалисти и близки. Те помагат със знания, опит и различни гледни точки. Може да не са пред камерата, но са неразделна част от това, което <span className="text-[#FB7D00] font-bold">FitFlow</span> представлява.
            </p>

            <div className="border-l-4 border-[#FB7D00] pl-5 my-8">
              <p className="text-xl italic text-[#333] leading-relaxed mb-2">
                &quot;Най-трудно е решението да се действа, останалото е просто упоритост.&quot;
              </p>
              <p className="text-base font-semibold text-[#666]">
                — Амелия Еърхарт
              </p>
            </div>
            <p className="text-base text-[#333] mt-6 font-semibold text-right clear-both">
              От екипа на FitFlow
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
