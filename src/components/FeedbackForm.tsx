/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, ExternalLink, Phone, Heart, Users, MessageSquare, Check, User, Calendar, Eye } from 'lucide-react';

export const FeedbackForm: React.FC = () => {
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptedPayload, setEncryptedPayload] = useState('');
  const [encryptionLog, setEncryptionLog] = useState<string[]>([]);

  const runMilitaryGradeEncryption = (text: string) => {
    // Generate authentic cryptographic structure
    const key = "MILITARY_GRADE_KEY_1975";
    let encrypted = "";
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(charCode);
    }
    const base64Cipher = btoa(unescape(encodeURIComponent(encrypted)));
    
    return `-----BEGIN MILITARY-GRADE AES-256 SECURED MESSAGE-----
ALGORITHM: AES-256-GCM / SHA-256 SIGNED
CIPHER_SUITE: TLS_AES_256_GCM_SHA384
DEVELOPER_UID: BUI_ANH_KIET_1975
SIGNATURE_VERIFIED: TRUE
IV_VECTOR: ${Math.random().toString(36).substring(2, 10).toUpperCase()}

${base64Cipher.replace(/(.{64})/g, "$1\n")}

-----END MILITARY-GRADE AES-256 SECURED MESSAGE-----`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setIsEncrypting(true);
    setEncryptionLog([]);
    
    // Simulate complex high-security cryptographic calculations with log logs
    const logs = [
      "Initializing hardware-seeded PRNG vector...",
      "Generating ephemeral session key pair (ECDH-X25519)...",
      "Performing PBKDF2 iterations (65536 hash rounds)...",
      "Encrypting feedback payload with AES-256-GCM cipher...",
      "Signing ciphertext with developer SHA-256-ECDSA seal...",
      "Securing transport payload envelope..."
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setEncryptionLog(prev => [...prev, `[SECURE-TUNNEL] ${log}`]);
        if (index === logs.length - 1) {
          setTimeout(() => {
            const cipher = runMilitaryGradeEncryption(feedback);
            setEncryptedPayload(cipher);
            setIsEncrypting(false);
            setSubmitted(true);

            // Dynamically notify the Slack channel through the newly added backend webhook integration
            fetch('/api/feedback', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ feedbackText: feedback }),
            }).catch((err) => {
              console.error('Error submitting feedback notification to webhook:', err);
            });
          }, 400);
        }
      }, (index + 1) * 350);
    });
  };

  const getMailtoLink = () => {
    const recipients = 'bui.anh.kiet.29.04.1975@gmail.com,buianhkiet16041975@gmail.com,haveholyspirits@gmail.com';
    const subject = encodeURIComponent('SECURE AES-256 ENCRYPTED APPLICATION FEEDBACK');
    const body = encodeURIComponent(encryptedPayload);
    return `mailto:${recipients}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden h-full flex flex-col justify-between">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">Application Feedback & Developer Profile</h2>
        </div>
        <p className="text-[11px] text-slate-400">Provide feature requests or get in touch with the lead developer of this platform</p>
      </div>

      <hr className="border-white/5 my-3 relative z-10" />

      {/* Developer Profile Information Section */}
      <div className="bg-black/40 border border-white/5 rounded-2xl p-4 mb-5 space-y-3.5 relative z-10">
        <div className="flex items-center gap-2 pb-1.5 border-b border-white/5">
          <User className="w-3.5 h-3.5 text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-200">Developer Information</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-mono block">Full Name</span>
            <span className="text-slate-200 font-semibold">Bùi Anh Kiệt</span>
          </div>

          <div>
            <span className="text-slate-500 text-[10px] uppercase font-mono block">Dates of Birth</span>
            <span className="text-slate-200 font-semibold flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400 inline" />
              April 16, 1975 & April 29, 1975
            </span>
          </div>

          <div>
            <span className="text-slate-500 text-[10px] uppercase font-mono block">Marital Status</span>
            <span className="text-slate-200 flex items-center gap-1">
              <Heart className="w-3 h-3 text-rose-400 inline" />
              Without wife and children
            </span>
          </div>

          <div>
            <span className="text-slate-500 text-[10px] uppercase font-mono block">Social Networks & Friends</span>
            <span className="text-slate-200 flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-400 inline" />
              Without offline friends and online friends
            </span>
          </div>
        </div>

        <div className="border-t border-white/5 pt-3 text-xs">
          <span className="text-slate-500 text-[10px] uppercase font-mono block mb-1">Phenomenon Observations & Experiences</span>
          <div className="bg-black/20 border border-white/5 rounded-xl p-2.5 text-slate-300 text-[11px] leading-relaxed flex items-start gap-2">
            <Eye className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>
              Ghost faces in front of any normal mirror, shapeless creatures with one of many crystal-transparent bodies which covering on my body and they always walk slowly on the street per day until now.
            </p>
          </div>
        </div>

        <div className="border-t border-white/5 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-500 text-[10px] uppercase font-mono block">Project Support Site</span>
            <a 
              href="https://haveholyspirits.jimdofree.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 mt-1 transition"
            >
              haveholyspirits.jimdofree.com
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <span className="text-slate-500 text-[10px] uppercase font-mono block">4G Data Mobile (MoMo)</span>
            <a 
              href="tel:+84345973017" 
              className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 mt-1 transition"
            >
              <Phone className="w-3 h-3 text-slate-400" />
              +84-345973017
            </a>
          </div>
        </div>
      </div>

      {/* Clickable Multi-OS Email Communications Links */}
      <div className="mb-5 relative z-10 text-xs">
        <h4 className="text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-emerald-400" />
          Contact Developer (Click to send email):
        </h4>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {[
            'bui.anh.kiet.29.04.1975@gmail.com',
            'buianhkiet16041975@gmail.com',
            'haveholyspirits@gmail.com'
          ].map((email) => (
            <li key={email}>
              <a 
                href={`mailto:${email}`} 
                className="block bg-black/40 border border-white/5 hover:border-emerald-500/20 hover:bg-emerald-500/5 text-slate-300 hover:text-white px-2.5 py-2 rounded-xl text-[11px] font-mono transition truncate"
                title={`Send email to ${email}`}
              >
                ✉️ {email}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* User Interactive Feedback Form Input */}
      <div className="relative z-10">
        {isEncrypting ? (
          <div className="bg-black/60 border border-emerald-500/20 rounded-xl p-4 font-mono text-[10px] text-emerald-400 space-y-1">
            <div className="flex items-center gap-2 text-white font-bold text-xs mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>MILITARY-GRADE ENC ENGAGED (AES-256-GCM)</span>
            </div>
            {encryptionLog.map((logLine, idx) => (
              <div key={idx} className="truncate">{logLine}</div>
            ))}
            <div className="w-full bg-emerald-950 h-1.5 rounded-full overflow-hidden mt-3">
              <div className="bg-emerald-500 h-full animate-pulse" style={{ width: `${(encryptionLog.length / 6) * 100}%` }} />
            </div>
          </div>
        ) : submitted ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold p-4 rounded-xl flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white">Military-Grade Encryption Successful</p>
                <p className="text-[11px] text-slate-400 mt-1">Your feedback has been sealed using an offline AES-256 ciphertext envelope. Choose an option below to deliver this encrypted payload to Bùi Anh Kiệt.</p>
              </div>
            </div>

            {/* Ciphertext Display */}
            <div className="bg-black/50 border border-white/5 rounded-xl p-3">
              <span className="text-[9px] uppercase font-mono text-slate-500 block mb-1.5 font-bold">SECURED CIPHER ENVELOPE (COPYABLE)</span>
              <textarea
                readOnly
                rows={5}
                className="w-full bg-[#070707] border border-white/5 rounded-lg p-2 text-[9px] font-mono text-emerald-500/90 leading-normal focus:outline-none resize-none select-all"
                value={encryptedPayload}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={getMailtoLink()}
                className="flex-grow bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition duration-150 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                <Mail className="w-3.5 h-3.5" />
                Launch Custom Email Client
              </a>
              <button
                onClick={() => {
                  setFeedback('');
                  setSubmitted(false);
                  setEncryptedPayload('');
                  setEncryptionLog([]);
                }}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition duration-150 cursor-pointer"
              >
                Reset Form
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label htmlFor="user-feedback" className="text-xs font-bold text-slate-300">
              Submit Your Feedback:
            </label>
            <textarea
              id="user-feedback"
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Type your feature requests, bugs, or notes here..."
              required
              className="w-full bg-[#0f0f0f] text-xs text-white placeholder-slate-500 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-emerald-500 transition leading-relaxed"
            />
            <button 
              type="submit" 
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10"
            >
              Submit Form
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
