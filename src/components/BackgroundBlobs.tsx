export default function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="blob w-[500px] h-[500px] bg-primary/10 top-[-100px] left-[-100px] animate-blob-drift" />
      <div className="blob w-[400px] h-[400px] bg-accent/8 bottom-[-80px] right-[-80px] animate-blob-drift" style={{ animationDelay: "-7s" }} />
      <div className="blob w-[300px] h-[300px] bg-primary/5 top-[40%] right-[10%] animate-blob-drift" style={{ animationDelay: "-14s" }} />
    </div>
  );
}
