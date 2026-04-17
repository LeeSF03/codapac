"use client"

import { useMemo } from "react"

import { useRouter } from "next/navigation"

import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { UsernameRule } from "./username-rule"
import { getUsernameStatus } from "./username-status"
import { UsernameStatusIcon } from "./username-status-icon"
import { UsernameStatusLine } from "./username-status-line"
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
  type UsernameFormValues,
  normalizeUsername,
  usernameSchema,
} from "./username-validation"

export function UsernameForm() {
  const router = useRouter()
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<UsernameFormValues>({
    resolver: zodResolver(usernameSchema),
    mode: "onChange",
    defaultValues: {
      username: "",
    },
  })
  const username = useWatch({ control, name: "username" }) ?? ""
  const status = useMemo(
    () =>
      getUsernameStatus({
        username,
        validationMessage: errors.username?.message,
      }),
    [errors.username?.message, username]
  )
  const canSubmit = status.kind === "available" && isValid && !isSubmitting

  const onSubmit = async () => {
    router.push("/")
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
                onChange={(event) =>
                  field.onChange(normalizeUsername(event.target.value))
                }
                onBlur={field.onBlur}
                maxLength={USERNAME_MAX_LENGTH}
                className="h-10 pr-10 pl-7 font-mono text-[13.5px]"
                aria-invalid={
                  status.kind === "invalid" || status.kind === "taken"
                }
                autoFocus
              />
            )}
          />
          <span className="absolute top-1/2 right-3 -translate-y-1/2">
            <UsernameStatusIcon status={status} />
          </span>
        </div>
        <UsernameStatusLine
          status={status}
          length={username.length}
          username={username}
        />
      </div>

      <ul className="text-muted-foreground grid gap-1 text-[12px]">
        <UsernameRule ok={username.length >= USERNAME_MIN_LENGTH}>
          At least {USERNAME_MIN_LENGTH} characters
        </UsernameRule>
        <UsernameRule
          ok={username.length <= USERNAME_MAX_LENGTH && username.length > 0}
        >
          Up to {USERNAME_MAX_LENGTH} characters
        </UsernameRule>
        <UsernameRule
          ok={username.length === 0 || USERNAME_PATTERN.test(username)}
        >
          Lowercase letters, numbers, and underscores only
        </UsernameRule>
      </ul>

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
