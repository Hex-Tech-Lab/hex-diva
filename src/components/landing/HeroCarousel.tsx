'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import chevronLeft from '@iconify-icons/mdi/chevron-left';
import chevronRight from '@iconify-icons/mdi/chevron-right';
import arrowRight from '@iconify-icons/mdi/arrow-right';

/* Aesop CustomVideo pattern: native HTML5 video + inline SVG controls — no player framework */
const SVG = {
  pause: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M7 4h3v16H7zM14 4h3v16h-3z" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M7 4l13 8-13 8z" />
    </svg>
  ),
  soundOn: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M4 9v6h4l5 5V4L8 9H4z" />
      <path fill="none" stroke="currentColor" strokeWidth="1.5" d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12" />
    </svg>
  ),
  soundOff: (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path fill="currentColor" d="M4 9v6h4l5 5V4L8 9H4z" />
      <path fill="none" stroke="currentColor" strokeWidth="1.5" d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
    </svg>
  ),
};

const SLIDE_COUNT = 2;

export function HeroCarousel() {
  const [slide, setSlideState] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      // Auto-trigger play to guarantee mobile browsers begin rendering the playback frame
      video.play().catch(() => {});
    }
  }, []);

  const setSlide = (i: number) => {
    const next = ((i % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT;
    setSlideState(next);
    const video = videoRef.current;
    if (!video) return;
    if (next === 0 && !paused) video.play().catch(() => {});
    else video.pause();
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  return (
    <div className="hero-carousel">
      <div className={`hero-slide${slide === 0 ? ' active' : ''}`}>
        <video
          ref={videoRef}
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          src="/landing/hero-cinematic_low.mp4"
        />
        <div className="hero-copy">
          <h1 className="serif">Immaculate, by intention</h1>
          <p>
            Hand-tied lash extensions and premium nails, crafted for longevity and natural movement.
            Sensory intelligence meets architectural refinement.
          </p>
          <a className="hero-cta" href="#collections">
            Discover <Icon icon={arrowRight} className="iconify" />
          </a>
        </div>
      </div>
      <div className={`hero-slide${slide === 1 ? ' active' : ''}`}>
        <div className="slide-products">
          <h2>The Collection</h2>
          <p>Treasured objects — collected, not purchased.</p>
          <div className="lineup">
            <figure>
              <div className="ph" style={{ backgroundImage: "url('/landing/eye_lashes_cat.png')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <figcaption>Luxury Lash Strip</figcaption>
            </figure>
            <figure>
              <div className="ph" style={{ backgroundImage: "url('/landing/nails_cat.png')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <figcaption>Premium Stick-on Nails</figcaption>
            </figure>
            <figure>
              <div className="ph" style={{ backgroundImage: "url('/landing/accessories_cat.png')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <figcaption>Precision Applicator</figcaption>
            </figure>
          </div>
        </div>
      </div>
      <button className="carousel-arrow prev" aria-label="Previous slide" onClick={() => setSlide(slide - 1)}>
        <Icon icon={chevronLeft} className="iconify" />
      </button>
      <button className="carousel-arrow next" aria-label="Next slide" onClick={() => setSlide(slide + 1)}>
        <Icon icon={chevronRight} className="iconify" />
      </button>
      <div className="carousel-dashes">
        {[0, 1].map((i) => (
          <button
            key={i}
            className={slide === i ? 'active' : ''}
            aria-label={`Slide ${i + 1}`}
            onClick={() => setSlide(i)}
          />
        ))}
      </div>
      <div className="media-controls">
        <button onClick={togglePlay} aria-label={paused ? 'Play video' : 'Pause video'}>
          {paused ? SVG.play : SVG.pause}
        </button>
        <button onClick={toggleMute} aria-label={muted ? 'Unmute video' : 'Mute video'}>
          {muted ? SVG.soundOff : SVG.soundOn}
        </button>
      </div>
    </div>
  );
}
