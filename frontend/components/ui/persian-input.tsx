"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { toPersianDigits, toEnglishDigits } from "@/lib/utils"

interface PersianInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  "onChange"
> {
  value?: string | number
  formatThousands?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function formatNumericValue(value: string | number, formatThousands: boolean) {
  const english = toEnglishDigits(String(value ?? ""))
  if (!formatThousands) return toPersianDigits(english)
  const digits = english.replace(/\D/g, "")
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, "٬")
  return toPersianDigits(grouped)
}

function PersianInput({
  value: valueProp,
  formatThousands = false,
  onChange,
  ...props
}: PersianInputProps) {
  const isControlled = valueProp !== undefined
  const [local, setLocal] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const displayValue = isControlled
    ? formatNumericValue(valueProp ?? "", formatThousands)
    : local

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const english = toEnglishDigits(e.target.value)
      const value = formatThousands ? english.replace(/\D/g, "") : english

      if (!isControlled) {
        setLocal(formatNumericValue(value, formatThousands))
      }

      if (onChange) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set
        nativeInputValueSetter?.call(e.target, value)
        e.target.value = value
        onChange(e)
      }
    },
    [formatThousands, isControlled, onChange]
  )

  React.useEffect(() => {
    if (isControlled && inputRef.current) {
      const el = inputRef.current
      const cursor = el.selectionStart
      el.value = formatNumericValue(valueProp ?? "", formatThousands)
      if (cursor !== null && document.activeElement === el) {
        const newCursor = Math.min(cursor, el.value.length)
        el.setSelectionRange(newCursor, newCursor)
      }
    }
  }, [formatThousands, valueProp, isControlled])

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      {...props}
    />
  )
}

export { PersianInput, type PersianInputProps }
