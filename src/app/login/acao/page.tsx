import PasswordResetForm from "@/components/password-reset-form";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PasswordActionPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  return (
    <PasswordResetForm
      mode={firstValue(params.mode)}
      actionCode={firstValue(params.oobCode)}
      continueUrl={firstValue(params.continueUrl)}
    />
  );
}
