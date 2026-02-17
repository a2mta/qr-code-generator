type QrPreviewProps = {
  svg: string;
};

export default function QrPreview({ svg }: QrPreviewProps) {
  return (
    <div className="grid w-full place-items-center" aria-live="polite">
      <div
        className="w-full max-w-[340px] rounded-xl border border-[#e5e5e5] bg-white p-3.5 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
