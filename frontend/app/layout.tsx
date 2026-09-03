import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'PDF to Word — Fast, Free Converter', description: 'Convert PDF files to editable Word documents.' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
