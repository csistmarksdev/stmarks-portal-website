"use client";

import { use } from "react";

import { FellowshipForm } from "../fellowship-form";

export default function EditFellowshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <FellowshipForm id={id} />;
}
