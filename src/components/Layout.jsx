import React from 'react';
import Navbar from './Navbar';

function Layout({ userType, children }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <Navbar userType={userType} />
            <main>{children}</main>
        </div>
    );
}

export default Layout;
