import Link from 'next/link'

export default function LandingPage() {
  return (
    <main style={{fontFamily:'Inter,-apple-system,sans-serif',
      background:'var(--surface)',color:'var(--text-1)'}}>

      {/* NAV */}
      <nav style={{display:'flex',alignItems:'center',
        justifyContent:'space-between',padding:'0 40px',
        height:'64px',borderBottom:'1px solid var(--border)',
        background:'rgba(255,255,255,0.95)',
        backdropFilter:'blur(8px)',position:'sticky',
        top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:'32px',height:'32px',
            background:'var(--brand)',borderRadius:'8px',
            display:'flex',alignItems:'center',
            justifyContent:'center'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" 
              fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 
                10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span style={{fontSize:'20px',fontWeight:800,
            color:'var(--text-1)',letterSpacing:'-0.5px'}}>
            JobIN
          </span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
          {['Features','AI Resume','Job Match','Pricing','Blog']
            .map(l => (
            <span key={l} style={{fontSize:'14px',fontWeight:500,
              color:'var(--text-2)',padding:'6px 14px',
              borderRadius:'8px',cursor:'pointer'}}>
              {l}
            </span>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <Link href="/auth/login">
            <button style={{fontSize:'14px',fontWeight:500,
              color:'var(--text-2)',padding:'8px 16px',
              border:'none',background:'none',cursor:'pointer',
              borderRadius:'8px'}}>
              Sign in
            </button>
          </Link>
          <Link href="/auth/signup">
            <button style={{fontSize:'14px',fontWeight:600,
              color:'white',padding:'8px 20px',
              background:'var(--brand)',border:'none',
              borderRadius:'8px',cursor:'pointer'}}>
              Get started free
            </button>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{padding:'88px 40px 72px',
        textAlign:'center',
        background:'linear-gradient(180deg,#F5F4FF 0%,#fff 100%)'}}>
        <div style={{display:'inline-flex',alignItems:'center',
          gap:'6px',background:'var(--brand-light)',
          border:'1px solid #C7D2FE',color:'var(--brand)',
          fontSize:'13px',fontWeight:600,
          padding:'5px 16px',borderRadius:'999px',
          marginBottom:'28px'}}>
          <span style={{width:'6px',height:'6px',
            borderRadius:'50%',background:'var(--brand)',
            display:'inline-block'}}/>
          Now live in the UK &amp; US
        </div>

        <h1 style={{fontSize:'clamp(40px,6vw,60px)',
          fontWeight:900,letterSpacing:'-2.5px',
          lineHeight:1.05,marginBottom:'8px'}}>
          Apply Smarter.
          <br/>
          <span style={{color:'var(--brand)'}}>
            Get Hired Faster.
          </span>
        </h1>

        <p style={{fontSize:'18px',color:'var(--text-2)',
          maxWidth:'520px',margin:'20px auto 40px',
          lineHeight:1.65}}>
          AI-powered job matching, resume tailoring, and 
          one-click autofill. Land your dream job in under 
          1 minute.
        </p>

        <div style={{display:'flex',alignItems:'center',
          justifyContent:'center',gap:'12px',
          marginBottom:'48px'}}>
          <Link href="/auth/signup">
            <button style={{fontSize:'16px',fontWeight:700,
              color:'white',padding:'14px 36px',
              background:'var(--brand)',border:'none',
              borderRadius:'10px',cursor:'pointer'}}>
              Start for free
            </button>
          </Link>
          <button style={{fontSize:'16px',fontWeight:500,
            color:'var(--text-2)',padding:'14px 28px',
            background:'white',border:'1px solid var(--border)',
            borderRadius:'10px',cursor:'pointer'}}>
            See how it works
          </button>
        </div>

        {/* TRUST BADGES */}
        <div style={{display:'flex',alignItems:'center',
          justifyContent:'center',gap:'12px',
          flexWrap:'wrap',marginBottom:'52px'}}>
          {[
            {icon:'PH',label:'#1 on Product Hunt',bg:'#4F46E5'},
            {icon:'TP',label:'4.9 on Trustpilot',bg:'#10B981'},
            {icon:'AI',label:'Featured by OpenAI',bg:'#6366F1'},
            {icon:'G',label:'Google for Startups',bg:'#F59E0B'},
          ].map(t => (
            <div key={t.label} style={{display:'flex',
              alignItems:'center',gap:'8px',
              background:'white',border:'1px solid var(--border)',
              padding:'6px 14px',borderRadius:'999px',
              fontSize:'12px',fontWeight:500,
              color:'var(--text-2)'}}>
              <span style={{width:'18px',height:'18px',
                borderRadius:'4px',background:t.bg,
                display:'flex',alignItems:'center',
                justifyContent:'center',fontSize:'9px',
                fontWeight:800,color:'white'}}>
                {t.icon}
              </span>
              {t.label}
            </div>
          ))}
        </div>

        {/* STATS */}
        <div style={{display:'flex',maxWidth:'600px',
          margin:'0 auto',background:'white',
          border:'1px solid var(--border)',
          borderRadius:'14px',overflow:'hidden',
          boxShadow:'0 2px 16px rgba(79,70,229,.06)'}}>
          {[
            {val:'1.2M+',label:'Trusted users'},
            {val:'3x',label:'More interviews'},
            {val:'80%',label:'Time saved'},
            {val:'8M+',label:'Live jobs'},
          ].map((s,i) => (
            <div key={s.label} style={{flex:1,padding:'20px',
              textAlign:'center',
              borderRight: i<3 ? '1px solid var(--border)' : 'none'}}>
              <div style={{fontSize:'24px',fontWeight:800,
                color:'var(--brand)',letterSpacing:'-1px'}}>
                {s.val}
              </div>
              <div style={{fontSize:'12px',color:'var(--text-3)',
                marginTop:'4px',fontWeight:500}}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SEARCH BAR */}
      <div style={{padding:'40px 40px 0',maxWidth:'860px',
        margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',
          gap:'8px',background:'white',
          border:'1.5px solid var(--border)',
          borderRadius:'14px',padding:'8px 8px 8px 20px',
          boxShadow:'0 4px 24px rgba(79,70,229,.08)'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" 
            fill="none" stroke="var(--text-3)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input placeholder="Job title, skills, or company..."
            style={{flex:1,border:'none',outline:'none',
              fontSize:'14px',color:'var(--text-1)',
              background:'transparent'}}/>
          <div style={{width:'1px',height:'24px',
            background:'var(--border)'}}/>
          <select style={{border:'none',outline:'none',
            fontSize:'13px',color:'var(--text-2)',
            background:'transparent',padding:'0 8px',
            cursor:'pointer'}}>
            <option>Remote</option>
            <option>Hybrid</option>
            <option>On-site</option>
          </select>
          <div style={{width:'1px',height:'24px',
            background:'var(--border)'}}/>
          <select style={{border:'none',outline:'none',
            fontSize:'13px',color:'var(--text-2)',
            background:'transparent',padding:'0 8px',
            cursor:'pointer'}}>
            <option>United Kingdom</option>
            <option>United States</option>
            <option>Europe</option>
          </select>
          <button style={{background:'var(--brand)',
            color:'white',border:'none',borderRadius:'10px',
            padding:'10px 22px',fontSize:'14px',
            fontWeight:600,cursor:'pointer',
            whiteSpace:'nowrap'}}>
            Find jobs
          </button>
        </div>
      </div>

      {/* JOB CARDS */}
      <section style={{padding:'40px 40px 0',
        maxWidth:'860px',margin:'0 auto'}}>
        <div style={{display:'flex',gap:'0',
          borderBottom:'2px solid var(--border)',
          marginBottom:'20px'}}>
          {['Best matches','Recently posted',
            'Remote only','Visa sponsored'].map((t,i) => (
            <div key={t} style={{fontSize:'14px',
              fontWeight: i===0 ? 700 : 500,
              color: i===0 ? 'var(--brand)' : 'var(--text-2)',
              padding:'10px 20px',cursor:'pointer',
              borderBottom: i===0 
                ? '2px solid var(--brand)' : '2px solid transparent',
              marginBottom:'-2px'}}>
              {t}
            </div>
          ))}
        </div>

        {[
          {logo:'G',logoColor:'#4F46E5',
            title:'Senior Software Engineer',
            company:'Google · London, UK',
            tags:['Remote','New today','£90k–£130k','Senior'],
            match:96,time:'2 hours ago'},
          {logo:'M',logoColor:'#0EA5E9',
            title:'Product Manager — AI Platform',
            company:'Microsoft · Manchester, UK',
            tags:['Hybrid','£75k–£95k','Mid-level','Visa OK'],
            match:88,time:'5 hours ago'},
          {logo:'A',logoColor:'#F59E0B',
            title:'Data Scientist — Growth',
            company:'Airbnb · Edinburgh, UK',
            tags:['Remote','New today','£65k–£85k'],
            match:82,time:'8 hours ago'},
        ].map(job => (
          <div key={job.title} style={{display:'flex',
            alignItems:'flex-start',justifyContent:'space-between',
            gap:'16px',background:'white',
            border:'1px solid var(--border)',borderRadius:'14px',
            padding:'20px 24px',marginBottom:'10px',
            cursor:'pointer',transition:'all .15s'}}>
            <div style={{display:'flex',gap:'14px',
              alignItems:'flex-start',flex:1}}>
              <div style={{width:'44px',height:'44px',
                borderRadius:'10px',
                background:'var(--surface-2)',
                border:'1px solid var(--border)',
                display:'flex',alignItems:'center',
                justifyContent:'center',fontSize:'16px',
                fontWeight:800,color:job.logoColor,
                flexShrink:0}}>
                {job.logo}
              </div>
              <div>
                <div style={{fontSize:'15px',fontWeight:700,
                  color:'var(--text-1)',marginBottom:'4px',
                  letterSpacing:'-0.2px'}}>
                  {job.title}
                </div>
                <div style={{fontSize:'13px',
                  color:'var(--text-2)',marginBottom:'10px'}}>
                  {job.company}
                </div>
                <div style={{display:'flex',gap:'6px',
                  flexWrap:'wrap'}}>
                  {job.tags.map(tag => (
                    <span key={tag} style={{fontSize:'11px',
                      fontWeight:600,padding:'3px 10px',
                      borderRadius:'999px',
                      background: tag==='Remote'||tag==='Hybrid' 
                        ? 'var(--brand-light)' 
                        : tag==='New today' 
                        ? '#F0FDF4' : 'var(--surface-2)',
                      color: tag==='Remote'||tag==='Hybrid' 
                        ? 'var(--brand)' 
                        : tag==='New today' 
                        ? '#16A34A' : 'var(--text-2)',
                      border: `1px solid ${
                        tag==='Remote'||tag==='Hybrid' 
                          ? '#C7D2FE' 
                          : tag==='New today' 
                          ? '#BBF7D0' : 'var(--border)'}`}}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',
              alignItems:'flex-end',gap:'8px',flexShrink:0}}>
              <span style={{fontSize:'12px',fontWeight:800,
                padding:'4px 12px',borderRadius:'999px',
                background: job.match>=90 
                  ? '#F0FDF4' : 'var(--brand-light)',
                color: job.match>=90 
                  ? '#16A34A' : 'var(--brand)',
                border: `1px solid ${job.match>=90 
                  ? '#BBF7D0' : '#C7D2FE'}`}}>
                {job.match}% match
              </span>
              <button style={{fontSize:'12px',fontWeight:600,
                color:'var(--brand)',padding:'6px 14px',
                borderRadius:'8px',
                border:'1.5px solid var(--brand)',
                background:'none',cursor:'pointer'}}>
                1-click apply
              </button>
              <span style={{fontSize:'11px',
                color:'var(--text-3)'}}>
                {job.time}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* FEATURES */}
      <section style={{padding:'88px 40px'}}>
        <p style={{fontSize:'13px',fontWeight:700,
          color:'var(--brand)',textTransform:'uppercase',
          letterSpacing:'.08em',textAlign:'center',
          marginBottom:'12px'}}>
          Everything you need
        </p>
        <h2 style={{textAlign:'center',marginBottom:'16px'}}>
          The only job search tool
          <br/>you&apos;ll ever{' '}
          <span style={{color:'var(--brand)'}}>need</span>
        </h2>
        <p style={{fontSize:'16px',color:'var(--text-2)',
          textAlign:'center',maxWidth:'480px',
          margin:'0 auto 56px',lineHeight:1.65}}>
          From resume to offer letter — JobIN handles every 
          step of your job search with AI.
        </p>
        <div style={{display:'grid',
          gridTemplateColumns:'1fr 1fr',gap:'16px',
          maxWidth:'860px',margin:'0 auto'}}>
          <div style={{background:'var(--brand)',
            border:'none',borderRadius:'14px',
            padding:'32px',gridColumn:'1/-1'}}>
            <span style={{fontSize:'11px',fontWeight:700,
              color:'white',background:'rgba(255,255,255,.2)',
              padding:'3px 12px',borderRadius:'999px',
              display:'inline-block',marginBottom:'16px'}}>
              Most popular
            </span>
            <div style={{fontSize:'28px',marginBottom:'16px'}}>
              ⚡
            </div>
            <h3 style={{color:'white',marginBottom:'10px'}}>
              AI resume tailor in 6 seconds
            </h3>
            <p style={{color:'rgba(255,255,255,.75)',
              fontSize:'14px',lineHeight:1.65}}>
              Paste any job description and JobIN rewrites 
              your resume to pass ATS, match keywords, and 
              highlight your most relevant experience — 
              in under 6 seconds.
            </p>
          </div>
          {[
            {icon:'🎯',title:'Personalised job matches',
              desc:'AI ranks only jobs you qualify for. No noise, no fake listings.'},
            {icon:'📋',title:'1-click autofill',
              desc:'Fill Workday, Greenhouse, Lever and 9+ ATS platforms instantly.'},
            {icon:'🤝',title:'Insider referrals',
              desc:'Find alumni at target companies. Get 4x more interviews.'},
            {icon:'🤖',title:'AI career copilot',
              desc:'24/7 chat for interview prep, salary negotiation, career advice.'},
          ].map(f => (
            <div key={f.title} style={{background:'var(--surface-2)',
              border:'1px solid var(--border)',
              borderRadius:'14px',padding:'28px',
              cursor:'pointer',transition:'all .15s'}}>
              <div style={{fontSize:'28px',marginBottom:'16px'}}>
                {f.icon}
              </div>
              <h3 style={{marginBottom:'10px'}}>{f.title}</h3>
              <p style={{fontSize:'14px',color:'var(--text-2)',
                lineHeight:1.65}}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{padding:'88px 40px',
        background:'var(--surface-2)'}}>
        <p style={{fontSize:'13px',fontWeight:700,
          color:'var(--brand)',textTransform:'uppercase',
          letterSpacing:'.08em',textAlign:'center',
          marginBottom:'12px'}}>
          How it works
        </p>
        <h2 style={{textAlign:'center',marginBottom:'16px'}}>
          From zero to{' '}
          <span style={{color:'var(--brand)'}}>hired</span>
          <br/>in 3 simple steps
        </h2>
        <p style={{fontSize:'16px',color:'var(--text-2)',
          textAlign:'center',maxWidth:'440px',
          margin:'0 auto 56px',lineHeight:1.65}}>
          Set up takes under 2 minutes. Results start 
          immediately.
        </p>
        <div style={{display:'grid',
          gridTemplateColumns:'repeat(3,1fr)',
          gap:'20px',maxWidth:'860px',margin:'0 auto'}}>
          {[
            {n:1,title:'Upload your resume',
              desc:'Drop in your CV or build from scratch. JobIN analyses it instantly and gives you a health score.'},
            {n:2,title:'Get matched jobs',
              desc:'AI surfaces the best matches from 8M+ listings across LinkedIn, Reed, Indeed, and more.'},
            {n:3,title:'Apply in seconds',
              desc:'Tailor your resume, generate a cover letter, and autofill the application — all in one click.'},
          ].map(s => (
            <div key={s.n} style={{background:'white',
              border:'1px solid var(--border)',
              borderRadius:'14px',padding:'28px',
              textAlign:'center'}}>
              <div style={{width:'36px',height:'36px',
                borderRadius:'50%',
                background:'var(--brand-light)',
                color:'var(--brand)',fontSize:'14px',
                fontWeight:800,display:'flex',
                alignItems:'center',justifyContent:'center',
                margin:'0 auto 20px'}}>
                {s.n}
              </div>
              <h3 style={{marginBottom:'10px'}}>{s.title}</h3>
              <p style={{fontSize:'14px',color:'var(--text-2)',
                lineHeight:1.65}}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{padding:'88px 40px'}}>
        <p style={{fontSize:'13px',fontWeight:700,
          color:'var(--brand)',textTransform:'uppercase',
          letterSpacing:'.08em',textAlign:'center',
          marginBottom:'12px'}}>
          Real results
        </p>
        <h2 style={{textAlign:'center',marginBottom:'16px'}}>
          1,200,000+ users{' '}
          <span style={{color:'var(--brand)'}}>love</span>
          {' '}JobIN
        </h2>
        <p style={{fontSize:'16px',color:'var(--text-2)',
          textAlign:'center',maxWidth:'440px',
          margin:'0 auto 56px',lineHeight:1.65}}>
          Real people. Real offers.
        </p>
        <div style={{display:'grid',
          gridTemplateColumns:'repeat(3,1fr)',
          gap:'16px',maxWidth:'860px',margin:'0 auto'}}>
          {[
            {init:'FH',bg:'#EEF2FF',tc:'#4F46E5',
              stars:5,name:'Fred H.',
              role:'Senior Software Engineer',
              text:'"Tripled my interview rate in 2 weeks. The resume tailor is genuinely magic."'},
            {init:'TC',bg:'#FEF9C3',tc:'#A16207',
              stars:5,name:'Tracy C.',
              role:'Digital Marketing Manager',
              text:'"Accepted an offer within 1 week. JobIN found jobs I would never have found manually."'},
            {init:'JC',bg:'#F0FDF4',tc:'#16A34A',
              stars:5,name:'Joshua C.',
              role:'Senior Product Manager',
              text:'"The insider referral feature got me a warm intro that led directly to my offer."'},
          ].map(t => (
            <div key={t.name} style={{background:'var(--surface-2)',
              border:'1px solid var(--border)',
              borderRadius:'14px',padding:'24px'}}>
              <div style={{color:'#F59E0B',fontSize:'14px',
                marginBottom:'12px'}}>
                {'★'.repeat(t.stars)}
              </div>
              <p style={{fontSize:'14px',color:'var(--text-1)',
                lineHeight:1.65,marginBottom:'20px'}}>
                {t.text}
              </p>
              <div style={{display:'flex',alignItems:'center',
                gap:'10px'}}>
                <div style={{width:'36px',height:'36px',
                  borderRadius:'50%',background:t.bg,
                  color:t.tc,fontSize:'12px',fontWeight:800,
                  display:'flex',alignItems:'center',
                  justifyContent:'center'}}>
                  {t.init}
                </div>
                <div>
                  <div style={{fontSize:'13px',fontWeight:700,
                    color:'var(--text-1)'}}>
                    {t.name}
                  </div>
                  <div style={{fontSize:'12px',
                    color:'var(--text-3)'}}>
                    {t.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section style={{padding:'88px 40px',
        background:'var(--surface-2)'}}>
        <p style={{fontSize:'13px',fontWeight:700,
          color:'var(--brand)',textTransform:'uppercase',
          letterSpacing:'.08em',textAlign:'center',
          marginBottom:'12px'}}>
          Simple pricing
        </p>
        <h2 style={{textAlign:'center',marginBottom:'16px'}}>
          Start free. Upgrade when
          <br/>you&apos;re{' '}
          <span style={{color:'var(--brand)'}}>ready.</span>
        </h2>
        <p style={{fontSize:'16px',color:'var(--text-2)',
          textAlign:'center',maxWidth:'400px',
          margin:'0 auto 56px',lineHeight:1.65}}>
          No credit card required. Cancel anytime.
        </p>
        <div style={{display:'grid',
          gridTemplateColumns:'repeat(3,1fr)',
          gap:'16px',maxWidth:'860px',margin:'0 auto'}}>
          {[
            {plan:'Free',price:'£0',desc:'For getting started.',
              cta:'Get started free',popular:false,
              features:['5 resume analyses/mo',
                '5 cover letters/mo','Basic match score',
                '10 job saves']},
            {plan:'Premium',price:'£15',
              desc:'For serious job seekers.',
              cta:'Start Premium',popular:true,
              features:['Unlimited resume tailoring',
                'Unlimited cover letters',
                'Advanced ATS analysis',
                'Kanban job tracker',
                '100 autofill apps/mo']},
            {plan:'Pro',price:'£29',
              desc:'Full power for fast movers.',
              cta:'Start Pro',popular:false,
              features:['Everything in Premium',
                'Unlimited autofill',
                'AI interview coach',
                'Insider referrals',
                'Priority AI processing']},
          ].map(p => (
            <div key={p.plan} style={{background:'white',
              border: p.popular 
                ? '2px solid var(--brand)' 
                : '1px solid var(--border)',
              borderRadius:'14px',padding:'28px',
              position:'relative'}}>
              {p.popular && (
                <div style={{position:'absolute',
                  top:'-13px',left:'50%',
                  transform:'translateX(-50%)',
                  background:'var(--brand)',color:'white',
                  fontSize:'11px',fontWeight:700,
                  padding:'4px 16px',borderRadius:'999px',
                  whiteSpace:'nowrap'}}>
                  Most popular
                </div>
              )}
              <div style={{fontSize:'12px',fontWeight:700,
                color:'var(--text-3)',textTransform:'uppercase',
                letterSpacing:'.06em',marginBottom:'12px'}}>
                {p.plan}
              </div>
              <div style={{fontSize:'36px',fontWeight:900,
                color:'var(--text-1)',letterSpacing:'-1.5px',
                lineHeight:1,marginBottom:'4px'}}>
                {p.price}
                <span style={{fontSize:'16px',fontWeight:500,
                  color:'var(--text-3)',letterSpacing:0}}>
                  /mo
                </span>
              </div>
              <p style={{fontSize:'13px',color:'var(--text-2)',
                margin:'12px 0 24px',lineHeight:1.5}}>
                {p.desc}
              </p>
              <button style={{width:'100%',padding:'12px',
                borderRadius:'8px',fontSize:'14px',
                fontWeight:600,cursor:'pointer',
                background: p.popular ? 'var(--brand)' : 'none',
                color: p.popular ? 'white' : 'var(--text-1)',
                border: p.popular 
                  ? 'none' : '1.5px solid var(--border)',
                marginBottom:'20px'}}>
                {p.cta}
              </button>
              {p.features.map(f => (
                <div key={f} style={{fontSize:'13px',
                  color:'var(--text-2)',padding:'7px 0',
                  display:'flex',gap:'8px',
                  alignItems:'center',
                  borderTop:'1px solid var(--border)'}}>
                  <span style={{color:'#16A34A',
                    fontWeight:700,fontSize:'14px'}}>
                    ✓
                  </span>
                  {f}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* CTA BANNER */}
      <div style={{margin:'0 40px 88px',
        background:'var(--brand)',borderRadius:'16px',
        padding:'52px 52px',display:'flex',
        alignItems:'center',justifyContent:'space-between',
        gap:'32px',maxWidth:'780px',
        marginLeft:'auto',marginRight:'auto'}}>
        <div>
          <h2 style={{color:'white',letterSpacing:'-1px',
            marginBottom:'10px'}}>
            Ready to land your dream job?
          </h2>
          <p style={{color:'rgba(255,255,255,.75)',
            fontSize:'15px'}}>
            Join 1,200,000+ job seekers already using JobIN. 
            Free to start, no credit card needed.
          </p>
        </div>
        <Link href="/auth/signup">
          <button style={{fontSize:'15px',fontWeight:700,
            color:'var(--brand)',padding:'14px 32px',
            borderRadius:'10px',border:'none',
            background:'white',cursor:'pointer',
            whiteSpace:'nowrap'}}>
            Start for free today
          </button>
        </Link>
      </div>

      {/* FOOTER */}
      <footer style={{padding:'48px 40px 28px',
        borderTop:'1px solid var(--border)'}}>
        <div style={{display:'flex',
          justifyContent:'space-between',
          gap:'40px',marginBottom:'40px',
          maxWidth:'860px',margin:'0 auto 40px'}}>
          <div style={{maxWidth:'200px'}}>
            <div style={{display:'flex',alignItems:'center',
              gap:'8px',marginBottom:'14px'}}>
              <div style={{width:'28px',height:'28px',
                background:'var(--brand)',borderRadius:'7px',
                display:'flex',alignItems:'center',
                justifyContent:'center'}}>
                <svg width="14" height="14" 
                  viewBox="0 0 24 24" fill="none" 
                  stroke="white" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z
                    M2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span style={{fontSize:'17px',fontWeight:800,
                color:'var(--text-1)'}}>
                JobIN
              </span>
            </div>
            <p style={{fontSize:'13px',color:'var(--text-3)',
              lineHeight:1.6}}>
              Apply smarter. Get hired faster. The UK&apos;s 
              most advanced AI job search platform.
            </p>
          </div>
          {[
            {title:'Features',links:['AI Resume Tailor',
              'Job Match Score','1-Click Autofill',
              'Insider Referrals','AI Copilot']},
            {title:'Resources',links:['Blog',
              'Interview Questions','ATS Guide',
              'Salary Insights']},
            {title:'Company',links:['About us',
              'Privacy policy','Terms of service',
              'Contact']},
          ].map(col => (
            <div key={col.title}>
              <h4 style={{fontSize:'12px',fontWeight:700,
                color:'var(--text-1)',
                textTransform:'uppercase',
                letterSpacing:'.06em',marginBottom:'14px'}}>
                {col.title}
              </h4>
              {col.links.map(l => (
                <div key={l} style={{fontSize:'13px',
                  color:'var(--text-2)',marginBottom:'10px',
                  cursor:'pointer'}}>
                  {l}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{display:'flex',
          justifyContent:'space-between',
          alignItems:'center',
          paddingTop:'20px',
          borderTop:'1px solid var(--border)',
          fontSize:'12px',color:'var(--text-3)',
          maxWidth:'860px',margin:'0 auto'}}>
          <span>© 2025 JobIN. All rights reserved.</span>
          <span>Made with care in the United Kingdom</span>
        </div>
      </footer>

    </main>
  )
}
