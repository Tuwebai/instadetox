import React from 'react';

export const Background: React.FC = () => {
  return (
    <>
      <div
        className="fixed inset-0 z-[-3] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/fondoappinstadetox.jpg')",
        }}
      />
      <div className="fixed inset-0 z-[-2] bg-slate-950/55" />
      <div className="fixed inset-0 z-[-1] bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.22),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(34,211,238,0.16),transparent_35%),radial-gradient(circle_at_60%_75%,rgba(45,212,191,0.18),transparent_40%)]" />
    </>
  );
};
