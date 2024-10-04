import { ExclamationTriangleIcon as IconError } from '@heroicons/react/20/solid'

export default function Error({ children }: { children: React.ReactNode }) {
    return (
        <div className="border-l-4 border-red-400 bg-red-50 p-4">
            <div className="flex">
                <div className="flex-shrink-0">
                    <IconError className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                    <p className="text-sm text-red-700">
                        {children}
                    </p>
                </div>
            </div>
        </div>
    )
}
