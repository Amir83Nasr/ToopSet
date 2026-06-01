import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog"
import { RegisterForm } from "@/components/auth/register-form"
import { useAuth } from "@/hooks/use-auth"

interface Props {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onLoginClick?: () => void
}

export function RegisterModal({
  children,
  open,
  onOpenChange,
  onLoginClick,
}: Props) {
  const { register } = useAuth()
  const close = () => onOpenChange?.(false)

  if (children) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent
          className="sm:max-w-2xl overflow-hidden p-0"
          showCloseButton
        >
          <DialogTitle className="sr-only">ثبت‌نام</DialogTitle>
          <div className="flex min-h-[500px]">
            <div className="relative hidden w-[45%] bg-gradient-to-br from-primary/10 to-primary/5 sm:block">
              <img
                src="/futsal.svg"
                alt=""
                className="absolute inset-0 size-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
              <div className="absolute bottom-6 right-6 left-6">
                <p className="text-lg font-bold">به توپ‌سِت بپیوندید</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ثبت‌نام رایگان و رزرو آسان سالن‌ها
                </p>
              </div>
            </div>
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="w-full max-w-sm">
                <RegisterForm register={register} onLoginClick={onLoginClick} onSuccess={close} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl overflow-hidden p-0"
        showCloseButton
      >
        <DialogTitle className="sr-only">ثبت‌نام</DialogTitle>
        <div className="flex min-h-[500px]">
          <div className="relative hidden w-[45%] bg-gradient-to-br from-primary/10 to-primary/5 sm:block">
            <img
              src="/futsal.svg"
              alt=""
              className="absolute inset-0 size-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
            <div className="absolute bottom-6 right-6 left-6">
              <p className="text-lg font-bold">به توپ‌سِت بپیوندید</p>
              <p className="mt-1 text-xs text-muted-foreground">
                ثبت‌نام رایگان و رزرو آسان سالن‌ها
              </p>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="w-full max-w-sm">
              <RegisterForm register={register} onLoginClick={onLoginClick} onSuccess={close} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
