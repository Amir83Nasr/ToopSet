"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { toPersianDigits, toEnglishDigits } from "@/lib/utils"

interface PersianInputProps extends Omit<
  React.ComponentProps<typeof Input>,
  "onChange"
> {
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function PersianInput({
  value: valueProp,
  onChange,
  ...props
}: PersianInputProps) {
  const isControlled = valueProp !== undefined
  const [local, setLocal] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const displayValue = isControlled ? toPersianDigits(valueProp ?? "") : local

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const english = toEnglishDigits(e.target.value)

      if (!isControlled) {
        setLocal(toPersianDigits(english))
      }

      if (onChange) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set
        nativeInputValueSetter?.call(e.target, english)
        e.target.value = english
        onChange(e)
      }
    },
    [isControlled, onChange]
  )

  React.useEffect(() => {
    if (isControlled && inputRef.current) {
      const el = inputRef.current
      const cursor = el.selectionStart
      el.value = toPersianDigits(String(valueProp ?? ""))
      if (cursor !== null && document.activeElement === el) {
        const newCursor = Math.min(cursor, el.value.length)
        el.setSelectionRange(newCursor, newCursor)
      }
    }
  }, [valueProp, isControlled])

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
