import React, { useState, useEffect } from 'react';

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

export const AppTour: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  // 1. Define the structural walkthrough steps mapping your application features
  const steps: TourStep[] = [
    {
      targetId: 'developer-profile-card',
      title: '👤 Developer Credentials Panel',
      description: 'Displays structural verify profiles for developer Bùi Anh Kiệt (DOB: April 16 & 29, 1975).',
      placement: 'bottom'
    },
    {
      targetId: 'slack-agent-status',
      title: '🤖 Conversational Slack Agent Portal',
      description: 'Monitors incoming channel triggers and processes background structural reasoning flows.',
      placement: 'right'
    },
    {
      targetId: 'mcp-server-logs',
      title: '📡 Live MCP Server Integration',
      description: 'Exposes database functions securely to Slack using Model Context Protocol endpoints.',
      placement: 'top'
    },
    {
      targetId: 'encryption-vault-toggle',
      title: '🔒 AES-256 Crypto Cryptography',
      description: 'Secures local environmental and user context logs with military-grade field level hashes.',
      placement: 'left'
    }
  ];

  // 2. Track target element positions dynamically to calculate tooltip anchors
  useEffect(() => {
    if (!isOpen || currentStep >= steps.length) return;

    const targetEl = document.getElementById(steps[currentStep].targetId);
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      const stepPlacement = steps[currentStep].placement;
      
      let topOffset = rect.bottom + window.scrollY + 10;
      let leftOffset = rect.left + window.scrollX;

      if (stepPlacement === 'top') topOffset = rect.top + window.scrollY - 130;
      if (stepPlacement === 'left') {
        topOffset = rect.top + window.scrollY;
        leftOffset = rect.left + window.scrollX - 260;
      }
      if (stepPlacement === 'right') {
        topOffset = rect.top + window.scrollY;
        leftOffset = rect.right + window.scrollX + 10;
      }

      setCoords({ top: topOffset, left: leftOffset });
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetEl.style.outline = '3px solid #10b981';
      targetEl.style.outlineOffset = '4px';
      targetEl.style.borderRadius = '16px';
      targetEl.style.transition = 'all 0.3s ease';

      return () => {
        targetEl.style.outline = 'none';
        targetEl.style.outlineOffset = '0px';
      };
    }
  }, [currentStep, isOpen]);

  if (!isOpen || currentStep >= steps.length) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: '260px',
        backgroundColor: '#09090b',
        color: '#f4f4f5',
        padding: '16px',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.1)',
        zIndex: 99999,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        transition: 'top 0.3s ease, left 0.3s ease'
      }}
    >
      <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 'bold', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {steps[currentStep].title}
      </h4>
      <p style={{ margin: '0 0 14px 0', fontSize: '11px', color: '#a1a1aa', lineHeight: '1.5' }}>
        {steps[currentStep].description}
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: '10px', color: '#71717a', fontWeight: '500', fontFamily: 'monospace' }}>
          STEP {currentStep + 1} OF {steps.length}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsOpen(false)}
            style={{ 
              fontSize: '10px', 
              padding: '6px 10px', 
              border: '1px solid rgba(255,255,255,0.08)', 
              background: 'rgba(255,255,255,0.04)', 
              color: '#a1a1aa',
              cursor: 'pointer', 
              borderRadius: '8px',
              fontWeight: '600',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.color = '#a1a1aa';
            }}
          >
            Skip
          </button>
          <button
            onClick={() => setCurrentStep(prev => prev + 1)}
            style={{ 
              fontSize: '10px', 
              padding: '6px 12px', 
              border: 'none', 
              background: '#10b981', 
              color: '#09090b', 
              cursor: 'pointer', 
              borderRadius: '8px', 
              fontWeight: 'bold',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#34d399';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#10b981';
            }}
          >
            {currentStep === steps.length - 1 ? 'Finish ✓' : 'Next ➔'}
          </button>
        </div>
      </div>
    </div>
  );
};
