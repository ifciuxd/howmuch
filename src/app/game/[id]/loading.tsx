import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <div className="h-14 border-b border-border md:h-16" />
      <div className="mx-auto grid w-full max-w-[1680px] flex-1 gap-5 px-4 pt-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-8 lg:pt-6">
        <Skeleton className="aspect-[4/3] rounded-xl lg:aspect-auto lg:h-[calc(100dvh-112px)]" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="mt-auto h-40" />
        </div>
      </div>
    </div>
  );
}
