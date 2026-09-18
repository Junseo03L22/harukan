import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'마음사이 — 오늘 필요한 다정함',description:'질문으로 마음을 정리하고 서로에게 필요한 배려를 알아가는 연인 앱.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ko"><body>{children}</body></html>}
