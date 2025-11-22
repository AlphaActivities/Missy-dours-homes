export const GlobalVideoBackground = () => {
  return (
    <div className="fixed inset-0 -z-50 w-full h-full overflow-hidden bg-black">
      <video
        src="/videos/herobackground.mp4"
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
};
