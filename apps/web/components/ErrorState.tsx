interface ErrorStateProps {
  message: string;
  action?: React.ReactNode;
}

export function ErrorState({ message, action }: ErrorStateProps) {
  return (
    <div className="glass flex flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center">
      <p className="text-lg font-semibold text-white">Oops, terjadi masalah</p>
      <p className="text-sm text-slate-400">{message}</p>
      {action}
    </div>
  );
}
