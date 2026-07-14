'use client';

export function NewsletterForm({
  className,
  placeholder = 'Enter your email',
}: {
  className?: string;
  placeholder?: string;
}) {
  return (
    <form className={className} onSubmit={(e) => e.preventDefault()}>
      <input type="email" placeholder={placeholder} aria-label={placeholder} />
      <button type="submit">Subscribe</button>
    </form>
  );
}
