"use client"

import { useRouter } from "next/navigation"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, Watch, useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { authClient } from "@/lib/auth-client"

import { UsernameRule } from "./username-rule"
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
  type UsernameFormValues,
  usernameSchema,
} from "./username-validation"

export function UsernameForm() {
  const router = useRouter()
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting, isValid },
  } = useForm<UsernameFormValues>({
    resolver: zodResolver(usernameSchema),
    mode: "onChange",
    defaultValues: {
      username: "",
    },
  })
  const canSubmit = isValid && !isSubmitting

  const onSubmit = async ({ username }: UsernameFormValues) => {
    const availabilityResult = await authClient.isUsernameAvailable({
      username,
    })

    if (availabilityResult.error) {
      setError("username", {
        message:
          availabilityResult.error.message ??
          "We could not check that username. Try again.",
      })
      return
    }

    if (!availabilityResult.data?.available) {
      setError("username", {
        message: "Username is already taken. Please try another.",
      })
      return
    }

    const updateResult = await authClient.updateUser({
      displayUsername: username,
      name: username,
      username,
    })

    if (updateResult.error) {
      setError("username", {
        message:
          updateResult.error.message ??
          "We could not save that username. Try another one.",
      })
      return
    }

    router.replace("/")
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
            @
          </span>
          <Controller
            control={control}
            name="username"
            render={({ field }) => (
              <Input
                id="username"
                type="text"
                inputMode="text"
                autoComplete="username"
                placeholder="ada"
                value={field.value}
                ref={field.ref}
                onChange={(event) => field.onChange(event.target.value)}
                onBlur={field.onBlur}
                maxLength={USERNAME_MAX_LENGTH}
                className="h-10 pr-10 pl-7 font-mono text-[13.5px]"
                autoFocus
              />
            )}
          />
        </div>
      </div>

      <Watch
        control={control}
        name="username"
        render={(value) => (
          <ul className="text-muted-foreground grid gap-1 text-[12px]">
            <UsernameRule ok={value.length >= USERNAME_MIN_LENGTH}>
              At least {USERNAME_MIN_LENGTH} characters
            </UsernameRule>
            <UsernameRule
              ok={value.length <= USERNAME_MAX_LENGTH && value.length > 0}
            >
              Up to {USERNAME_MAX_LENGTH} characters
            </UsernameRule>
            <UsernameRule
              ok={value.length === 0 || USERNAME_PATTERN.test(value)}
            >
              Uppercase letters, lowercase letters, numbers, and underscores
              only
            </UsernameRule>
          </ul>
        )}
      />

      <Button
        type="submit"
        className="mt-2 h-10 font-medium"
        disabled={!canSubmit}
      >
        {isSubmitting ? "Finishing up..." : "Continue to board"}
      </Button>

      <p className="text-muted-foreground text-center text-[11px]">
        You can change this later in{" "}
        <span className="text-foreground font-medium">Settings / Profile</span>.
      </p>
    </form>
  )
}
