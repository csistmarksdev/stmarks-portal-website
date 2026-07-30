"use client";

import { use } from "react";

import { DownloadForm } from "../download-form";

export default function EditDownloadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <DownloadForm id={id} />;
}
