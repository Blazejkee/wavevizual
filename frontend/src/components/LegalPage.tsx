import React, { useState } from 'react'

interface NavProps {
  onHome?: () => void
  onBlog?: () => void
  onLegal?: () => void
  onSignIn?: () => void
}

type LegalTab = 'terms' | 'privacy' | 'refunds' | 'cookies'

const TABS: { id: LegalTab; label: string }[] = [
  { id: 'terms',   label: 'Terms of Service' },
  { id: 'privacy', label: 'Privacy Policy'   },
  { id: 'refunds', label: 'Refund Policy'    },
  { id: 'cookies', label: 'Cookie Policy'    },
]

function SiteNav({ onHome, onBlog, onLegal }: NavProps) {
  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '20px 48px', borderBottom: '1px solid rgba(255,255,255,0.07)',
      position: 'sticky', top: 0, background: 'rgba(10,10,18,0.92)',
      backdropFilter: 'blur(12px)', zIndex: 100,
    }}>
      <button onClick={onHome} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg,#6c63ff,#00d4ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>≋</div>
        <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px', color: '#fff' }}>WaveVizual</span>
      </button>
      <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
        <button onClick={onBlog}  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer' }}>Blog</button>
        <button onClick={onLegal} style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>Legal</button>
        <button onClick={onHome} style={{
          background: 'linear-gradient(135deg,#6c63ff,#00d4ff)', border: 'none',
          color: '#fff', padding: '9px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
        }}>Open Editor</button>
      </div>
    </nav>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#e2e8f0' }}>{title}</h2>
      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.8 }}>
        {children}
      </div>
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '0 0 14px' }}>{children}</p>
}

function UL({ items }: { items: string[] }) {
  return (
    <ul style={{ paddingLeft: 20, margin: '0 0 14px' }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: 6 }}>{item}</li>
      ))}
    </ul>
  )
}

const EFFECTIVE_DATE = 'May 13, 2026'

export default function LegalPage(props: NavProps) {
  const [tab, setTab] = useState<LegalTab>('terms')

  return (
    <div style={{ background: '#0a0a12', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <SiteNav {...props} />

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '60px 48px 100px' }}>

        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1px', marginBottom: 10 }}>Legal</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>
            Effective date: {EFFECTIVE_DATE} &nbsp;·&nbsp; WaveVizual, operated by its founders.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 48, overflowX: 'auto',
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none', border: 'none',
              color: tab === t.id ? '#a78bfa' : 'rgba(255,255,255,0.4)',
              fontSize: 14, fontWeight: tab === t.id ? 600 : 400,
              cursor: 'pointer', padding: '12px 20px', whiteSpace: 'nowrap',
              borderBottom: tab === t.id ? '2px solid #6c63ff' : '2px solid transparent',
              marginBottom: -1,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Terms of Service ── */}
        {tab === 'terms' && (
          <div>
            <Section title="1. Acceptance of Terms">
              <P>By accessing or using WaveVizual ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</P>
              <P>We reserve the right to update these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.</P>
            </Section>

            <Section title="2. Description of Service">
              <P>WaveVizual is an online music visualizer video generator. You upload audio and image files, configure a visualizer, and we render an MP4 video file for download.</P>
              <P>The Service is provided on a token-based model. Some features are available for free; others require tokens purchased in advance.</P>
            </Section>

            <Section title="3. Account Registration">
              <P>You may use the Service without an account. Creating an account is required to purchase tokens and access priority rendering. You are responsible for keeping your login credentials secure.</P>
              <P>You must provide accurate information when registering. Accounts found to be fraudulent or used for abuse will be terminated without refund.</P>
            </Section>

            <Section title="4. Tokens and Payments">
              <P>Tokens are purchased in advance and deducted per render. Current rates:</P>
              <UL items={['1080p HD render — 10 tokens', '4K UHD render — 25 tokens']} />
              <P>Tokens do not expire and are non-transferable between accounts. All payments are processed securely. Prices are listed in USD and may change with reasonable notice.</P>
            </Section>

            <Section title="5. Acceptable Use">
              <P>You agree not to use the Service to:</P>
              <UL items={[
                'Upload audio or images to which you do not hold the rights',
                'Generate content that is illegal, harmful, or violates third-party rights',
                'Attempt to reverse-engineer, overload, or disrupt the Service',
                'Circumvent the token system or queue mechanics',
                'Create multiple accounts to abuse free-tier limits',
              ]} />
            </Section>

            <Section title="6. Intellectual Property">
              <P>You retain full ownership of the audio, images, and videos you upload and generate. WaveVizual claims no ownership over your content.</P>
              <P>The WaveVizual software, interface, templates, and branding are owned by WaveVizual and may not be copied, modified, or redistributed without written permission.</P>
            </Section>

            <Section title="7. Free Queue and Service Availability">
              <P>Free-tier renders are placed in a shared queue. Wait times are approximate and not guaranteed. We make no commitment to processing time for free renders.</P>
              <P>We strive for high availability but do not guarantee uninterrupted service. Scheduled maintenance or unexpected outages may occur.</P>
            </Section>

            <Section title="8. Limitation of Liability">
              <P>To the maximum extent permitted by law, WaveVizual is not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including loss of data, revenue, or business opportunity.</P>
              <P>Our total liability to you for any claim arising from these terms or your use of the Service is limited to the amount you paid to WaveVizual in the 30 days preceding the claim.</P>
            </Section>

            <Section title="9. Termination">
              <P>We may suspend or terminate your account if you violate these terms, with or without notice. Upon termination, your token balance is forfeited unless otherwise required by applicable law.</P>
            </Section>

            <Section title="10. Governing Law">
              <P>These terms are governed by applicable law. Any disputes shall be resolved through good-faith negotiation before any formal proceedings.</P>
            </Section>

            <Section title="11. Contact">
              <P>Questions about these terms? Email us at <span style={{ color: '#a78bfa' }}>legal@wavevizual.com</span></P>
            </Section>
          </div>
        )}

        {/* ── Privacy Policy ── */}
        {tab === 'privacy' && (
          <div>
            <Section title="1. What We Collect">
              <P>When you create an account, we collect:</P>
              <UL items={[
                'Email address and hashed password',
                'Token balance and purchase history',
                'Render job metadata (format, quality, timestamps)',
              ]} />
              <P>When you use the Service without an account, we do not collect personally identifiable information. Uploaded files are stored temporarily for rendering and deleted automatically.</P>
            </Section>

            <Section title="2. How We Use Your Data">
              <P>We use your data exclusively to:</P>
              <UL items={[
                'Operate your account and token balance',
                'Process and deliver rendered videos',
                'Send transactional emails (password reset, purchase confirmation)',
                'Detect abuse and enforce our Terms of Service',
              ]} />
              <P>We do not sell, rent, or share your personal data with third parties for marketing purposes.</P>
            </Section>

            <Section title="3. File Storage">
              <P>Uploaded audio and image files are stored temporarily on our servers for the duration of rendering and for a short period afterward to enable download. Files are deleted automatically within 24 hours of job completion.</P>
              <P>We do not analyze, train on, or otherwise use the content of your uploaded files for any purpose other than rendering.</P>
            </Section>

            <Section title="4. Payment Data">
              <P>We do not store credit card numbers or payment credentials. All payment processing is handled by our payment processor. We store only the transaction metadata (amount, timestamp, tokens granted).</P>
            </Section>

            <Section title="5. Data Retention">
              <P>Account data (email, token balance, purchase history) is retained for as long as your account is active. You may request deletion of your account and associated data at any time by emailing <span style={{ color: '#a78bfa' }}>privacy@wavevizual.com</span>.</P>
              <P>Render job history is retained for 90 days before automatic deletion.</P>
            </Section>

            <Section title="6. Security">
              <P>Passwords are hashed using bcrypt before storage — we never store plain-text passwords. All traffic between your browser and our servers is encrypted via HTTPS.</P>
              <P>While we take security seriously, no system is perfectly secure. We encourage you to use a strong, unique password.</P>
            </Section>

            <Section title="7. Cookies">
              <P>See our Cookie Policy for details on what cookies we use and why.</P>
            </Section>

            <Section title="8. Your Rights">
              <P>Depending on your location, you may have the right to access, correct, or delete your personal data. To exercise these rights, email <span style={{ color: '#a78bfa' }}>privacy@wavevizual.com</span>.</P>
            </Section>

            <Section title="9. Changes">
              <P>We may update this policy periodically. We will notify registered users of material changes via email.</P>
            </Section>
          </div>
        )}

        {/* ── Refund Policy ── */}
        {tab === 'refunds' && (
          <div>
            <Section title="Our Refund Policy">
              <P>We want you to be satisfied with WaveVizual. Here is how refunds work.</P>
            </Section>

            <Section title="Unused Tokens">
              <P>If you purchased a token pack and have not used any tokens, you may request a full refund within 14 days of purchase. Contact us at <span style={{ color: '#a78bfa' }}>support@wavevizual.com</span> with your account email and order details.</P>
            </Section>

            <Section title="Partially Used Token Packs">
              <P>If you have used some tokens, we will refund the proportional value of your remaining unused tokens, calculated at the per-token rate of the pack you purchased.</P>
              <P>Example: You purchased the Creator Pack (100 tokens, $19). You used 30 tokens. We will refund $13.30 (70% of $19).</P>
            </Section>

            <Section title="Rendering Failures">
              <P>If a render fails due to a technical error on our side (server crash, encoder bug, infrastructure issue), the tokens deducted for that job will be automatically refunded to your balance.</P>
              <P>Failures caused by your uploaded files (corrupted audio, unsupported format, file too large) are not eligible for token refunds, as the error occurs before rendering begins.</P>
            </Section>

            <Section title="Free Queue Users">
              <P>Free-tier renders do not involve token deductions. There is nothing to refund for free renders.</P>
            </Section>

            <Section title="How to Request a Refund">
              <P>Email <span style={{ color: '#a78bfa' }}>support@wavevizual.com</span> with:</P>
              <UL items={[
                'Your account email address',
                'The date of purchase',
                'The reason for your refund request',
              ]} />
              <P>We aim to process all refund requests within 3 business days.</P>
            </Section>

            <Section title="Chargebacks">
              <P>If you initiate a chargeback with your bank or card provider without first contacting us, your account will be suspended pending investigation. We strongly encourage reaching out to us first — we are happy to help.</P>
            </Section>
          </div>
        )}

        {/* ── Cookie Policy ── */}
        {tab === 'cookies' && (
          <div>
            <Section title="What Are Cookies">
              <P>Cookies are small text files stored in your browser when you visit a website. They help the site remember information about your visit.</P>
            </Section>

            <Section title="Cookies We Use">
              <P>WaveVizual is a single-page application. We use minimal cookies:</P>
              <UL items={[
                'Authentication token (localStorage) — stores your JWT login token so you stay logged in across sessions. Not a cookie in the traditional sense; stored only in your browser\'s localStorage.',
                'No third-party advertising or tracking cookies are set.',
                'No analytics cookies (e.g. Google Analytics) are currently used.',
              ]} />
            </Section>

            <Section title="Session Persistence">
              <P>Your login session is stored in your browser's localStorage under the key <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>wv_token</code>. This token expires after 30 days. You can clear it by signing out or clearing your browser's localStorage.</P>
            </Section>

            <Section title="Third-Party Services">
              <P>We use a payment processor to handle transactions. Their cookies and privacy practices are governed by their own policies. No tracking pixels or marketing tags are embedded in WaveVizual.</P>
            </Section>

            <Section title="Your Choices">
              <P>You can disable localStorage in your browser settings, but doing so will prevent you from staying logged in. If you prefer not to have any session data stored, simply do not create an account or log in — the Service works without authentication.</P>
            </Section>

            <Section title="Contact">
              <P>Questions? Email <span style={{ color: '#a78bfa' }}>privacy@wavevizual.com</span></P>
            </Section>
          </div>
        )}

      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.07)', padding: '28px 48px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        color: 'rgba(255,255,255,0.3)', fontSize: 13,
      }}>
        <span>© 2026 WaveVizual</span>
        <div style={{ display: 'flex', gap: 24 }}>
          <button onClick={props.onBlog}  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 13 }}>Blog</button>
          <button onClick={props.onLegal} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 13 }}>Legal</button>
        </div>
      </footer>
    </div>
  )
}
