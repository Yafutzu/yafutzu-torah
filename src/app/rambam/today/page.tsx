import { redirect } from "next/navigation";

export default function RambamToday() {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  redirect(`/rambam/${ymd}`);
}
