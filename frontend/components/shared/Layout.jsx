import Header from "./Header";
import Footer from "./Footer";

const Layout = ({ children }) => {
    return (
        <div className="app">
            <Header />
            <main className="pt-20">{children}</main>
            <Footer />
        </div>
    )
}

export default Layout;