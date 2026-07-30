"use client";

import { use } from "react";

import { BlogForm } from "../blog-form";

export default function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <BlogForm id={id} />;
}
