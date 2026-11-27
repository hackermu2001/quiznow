export default function UserAvatar({ avatar, size = 'md', className = '' }) {
  const isUrl = typeof avatar === 'string' && /^https?:\/\//i.test(avatar);

  const imgSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  };
  const textSizes = {
    sm: 'text-base leading-none',
    md: 'text-lg leading-none',
    lg: 'text-2xl leading-none',
  };

  if (isUrl) {
    return (
      <img
        src={avatar}
        alt="Avatar"
        referrerPolicy="no-referrer"
        className={`${imgSizes[size] || imgSizes.md} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <span className={`${textSizes[size] || textSizes.md} inline-flex items-center justify-center ${className}`}>
      {avatar || '🦊'}
    </span>
  );
}
