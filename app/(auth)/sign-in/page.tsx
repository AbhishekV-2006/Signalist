"use client";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import FooterLink from "@/components/forms/FooterLink";
import { signInWithEmail, signUpWithEmail } from "@/lib/actions/auth.actions";
import { toast } from "sonner";
import { signInEmail } from "better-auth/api";
import { useRouter } from "next/navigation";

const SignIn = () => {
  const router = useRouter();

  const {
    handleSubmit,
    register,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormData>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const onSubmit = async (data: SignInFormData) => {
    try {
      const result = await signInWithEmail(data);
      if (result.success) router.push("/");
    } catch (e) {
      console.error(e);
      toast.error("Sign in failed", {
        description: e instanceof Error ? e.message : "Failed to sign in.",
      });
    }
  };

  return (
    <>
      <h1 className="form-title">Welcome Back</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <InputField
          name="email"
          label="Email"
          placeholder="contact@example.com"
          register={register}
          error={errors.email}
          validation={{
            required: "Email is required",
            pattern: /^\w+@\w+\.\w+$/,
          }}
        />
        <InputField
          name="password"
          label="Password"
          placeholder="Enter your password"
          type="password"
          register={register}
          error={errors.password}
          validation={{ required: "Password is required" }}
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="yellow-btn w-full mt-5"
        >
          {isSubmitting ? "Logging In" : "Log In"}
        </Button>

        <FooterLink
          text="Don't have an Account?"
          linkText="SignUp"
          href="/sign-up"
        />
      </form>
    </>
  );
};

export default SignIn;
