// Footer.tsx
export default function Footer() {
  return (
    <footer className="mt-12 pb-8 text-center">
      <div className="inline-block px-6 py-3 bg-black/30 backdrop-blur-lg rounded-full border border-cyan-700/20">
        <p className="text-cyan-100 text-sm">
          © {new Date().getFullYear()} • Built with ❤️ by <span className="font-medium text-white">Patchipala Srinivas</span>
        </p>
      </div>
    </footer>
  );
}