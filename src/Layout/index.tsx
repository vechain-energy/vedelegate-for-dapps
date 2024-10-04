import Menu from './Menu';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <div className='space-y-4 p-4'>
            <div className='flex justify-end'><Menu /></div>
            <div className='flex justify-center'>
                {children}
            </div>
        </div>
    )
}