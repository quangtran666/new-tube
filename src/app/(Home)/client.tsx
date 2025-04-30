"use client";

import { trpc } from "@/trpc/client";

export const PageClient = () => {
  const [data] = trpc.hello.useSuspenseQuery({
    text: "Quang",
  });

  return <div>Page client: {data.greeting}</div>;
};
