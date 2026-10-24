'use client';

import React from 'react';

export function AmbientAtmosphere() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* ── 1. Master Champagne Radial Lights ── */}
      {/* Upper-right primary ambient bloom (matches massive golden illumination in target design) */}
      <div className="absolute -top-32 right-0 w-[1100px] h-[750px] bg-[radial-gradient(ellipse_at_top_right,rgba(224,200,145,0.20)_0%,rgba(194,168,120,0.12)_35%,rgba(138,110,60,0.05)_65%,transparent_80%)] blur-2xl" />

      {/* Top-center header illumination */}
      <div className="absolute -top-20 left-1/3 w-[850px] h-[450px] bg-[radial-gradient(ellipse_at_top,rgba(215,185,130,0.14)_0%,rgba(194,168,120,0.06)_50%,transparent_75%)] blur-3xl" />

      {/* Behind greeting text warm glow */}
      <div className="absolute top-16 left-1/4 w-[600px] h-[350px] bg-[radial-gradient(circle_at_center,rgba(224,205,167,0.09)_0%,rgba(194,168,120,0.04)_50%,transparent_70%)] blur-2xl" />

      {/* Mid-right ambient reflection */}
      <div className="absolute top-1/3 -right-20 w-[650px] h-[650px] bg-[radial-gradient(circle_at_center,rgba(194,168,120,0.11)_0%,rgba(138,110,60,0.04)_55%,transparent_75%)] blur-3xl" />

      {/* Bottom-left corner warm glow (under sidebar & reflection card) */}
      <div className="absolute -bottom-28 -left-20 w-[750px] h-[600px] bg-[radial-gradient(ellipse_at_bottom_left,rgba(215,185,130,0.16)_0%,rgba(194,168,120,0.08)_45%,transparent_70%)] blur-3xl" />

      {/* Bottom-right corner subtle illumination */}
      <div className="absolute -bottom-24 right-1/4 w-[600px] h-[400px] bg-[radial-gradient(circle_at_bottom,rgba(194,168,120,0.09)_0%,transparent_70%)] blur-3xl" />

      {/* ── 2. Cinematic Flowing Golden Light Ribbons / Aurora Waves ── */}
      <svg
        className="absolute inset-0 w-full h-full mix-blend-screen opacity-90"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Main luminous champagne gold gradient */}
          <linearGradient id="goldRibbonWave1" x1="0%" y1="30%" x2="100%" y2="70%">
            <stop offset="0%" stopColor="#9C7E45" stopOpacity="0" />
            <stop offset="25%" stopColor="#C2A878" stopOpacity="0.45" />
            <stop offset="55%" stopColor="#F5ECD5" stopOpacity="0.85" />
            <stop offset="78%" stopColor="#C9AC7A" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#7A5F2D" stopOpacity="0" />
          </linearGradient>

          {/* Secondary bright core gradient */}
          <linearGradient id="goldRibbonCore" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C2A878" stopOpacity="0" />
            <stop offset="30%" stopColor="#FFF2DC" stopOpacity="0.75" />
            <stop offset="60%" stopColor="#E2C798" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#A88B52" stopOpacity="0" />
          </linearGradient>

          {/* Warm bronze under-ribbon */}
          <linearGradient id="goldRibbonWarm" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B39359" stopOpacity="0" />
            <stop offset="35%" stopColor="#D9BF8F" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#8C6E38" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#5E4924" stopOpacity="0" />
          </linearGradient>

          {/* Multi-stage blur filters for silky optical bloom */}
          <filter id="bloomWide" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="22" result="blur" />
          </filter>
          <filter id="bloomMedium" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" result="blur" />
          </filter>
          <filter id="bloomSoft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
          </filter>
        </defs>

        {/* ── Wave 1: Flowing across top behind greeting to top-right ── */}
        {/* Layer 1A: Wide bloom halo */}
        <path
          d="M 280 80 C 620 180, 1080 150, 1550 85 C 1720 62, 1850 48, 1960 40"
          fill="none"
          stroke="url(#goldRibbonWave1)"
          strokeWidth="32"
          filter="url(#bloomWide)"
          opacity="0.45"
        />
        {/* Layer 1B: Mid-glow beam */}
        <path
          d="M 280 80 C 620 180, 1080 150, 1550 85 C 1720 62, 1850 48, 1960 40"
          fill="none"
          stroke="url(#goldRibbonWave1)"
          strokeWidth="9"
          filter="url(#bloomMedium)"
          opacity="0.75"
        />
        {/* Layer 1C: Specular ribbon filament */}
        <path
          d="M 280 80 C 620 180, 1080 150, 1550 85 C 1720 62, 1850 48, 1960 40"
          fill="none"
          stroke="url(#goldRibbonCore)"
          strokeWidth="2.8"
          filter="url(#bloomSoft)"
          opacity="0.9"
        />

        {/* Accompanying parallel upper streak */}
        <path
          d="M 520 40 C 850 125, 1260 110, 1680 55 C 1820 38, 1900 30, 1960 25"
          fill="none"
          stroke="url(#goldRibbonCore)"
          strokeWidth="1.5"
          filter="url(#bloomSoft)"
          opacity="0.55"
        />

        {/* ── Wave 2: Sweeping down right edge past stat cards ── */}
        {/* Layer 2A: Wide bloom */}
        <path
          d="M 1940 70 C 1820 140, 1660 240, 1680 380 C 1700 480, 1820 560, 1940 680"
          fill="none"
          stroke="url(#goldRibbonWarm)"
          strokeWidth="28"
          filter="url(#bloomWide)"
          opacity="0.4"
        />
        {/* Layer 2B: Mid ribbon */}
        <path
          d="M 1940 70 C 1820 140, 1660 240, 1680 380 C 1700 480, 1820 560, 1940 680"
          fill="none"
          stroke="url(#goldRibbonWave1)"
          strokeWidth="7"
          filter="url(#bloomMedium)"
          opacity="0.65"
        />
        {/* Layer 2C: Luminous core */}
        <path
          d="M 1940 70 C 1820 140, 1660 240, 1680 380 C 1700 480, 1820 560, 1940 680"
          fill="none"
          stroke="url(#goldRibbonCore)"
          strokeWidth="2.2"
          filter="url(#bloomSoft)"
          opacity="0.8"
        />

        {/* ── Wave 3: Bottom-left sweep under sidebar & reflection ── */}
        {/* Layer 3A: Wide bloom */}
        <path
          d="M -60 920 C 180 840, 480 880, 780 970 C 960 1025, 1100 1090, 1220 1140"
          fill="none"
          stroke="url(#goldRibbonWave1)"
          strokeWidth="26"
          filter="url(#bloomWide)"
          opacity="0.45"
        />
        {/* Layer 3B: Mid ribbon */}
        <path
          d="M -60 920 C 180 840, 480 880, 780 970 C 960 1025, 1100 1090, 1220 1140"
          fill="none"
          stroke="url(#goldRibbonWave1)"
          strokeWidth="6"
          filter="url(#bloomMedium)"
          opacity="0.7"
        />
        {/* Layer 3C: Specular ribbon */}
        <path
          d="M -60 920 C 180 840, 480 880, 780 970 C 960 1025, 1100 1090, 1220 1140"
          fill="none"
          stroke="url(#goldRibbonCore)"
          strokeWidth="2"
          filter="url(#bloomSoft)"
          opacity="0.85"
        />

        {/* ── Wave 4: Bottom-right subtle accent ── */}
        <path
          d="M 1480 1080 C 1660 990, 1810 970, 1950 1000"
          fill="none"
          stroke="url(#goldRibbonWave1)"
          strokeWidth="18"
          filter="url(#bloomWide)"
          opacity="0.35"
        />
        <path
          d="M 1480 1080 C 1660 990, 1810 970, 1950 1000"
          fill="none"
          stroke="url(#goldRibbonCore)"
          strokeWidth="2"
          filter="url(#bloomSoft)"
          opacity="0.65"
        />
      </svg>

      {/* ── 3. Cinematic Vignette ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(5,5,5,0.72)_100%)]" />
    </div>
  );
}
