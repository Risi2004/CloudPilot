import React from 'react';
import Navbar from '../../components/LandingPage/Navbar/Navbar';
import Hero from '../../components/LandingPage/Hero/Hero';
import CoreIntelligence from '../../components/LandingPage/CoreIntelligence/CoreIntelligence';
import HowItWorks from '../../components/LandingPage/HowItWorks/HowItWorks';
import Integrations from '../../components/LandingPage/Integrations/Integrations';
import Pricing from '../../components/LandingPage/Pricing/Pricing';
import FAQ from '../../components/LandingPage/FAQ/FAQ';
import Footer from '../../components/LandingPage/Footer/Footer';
import './LandingPage.css';

function LandingPage() {
    return (
        <div className="landing-page-wrapper">
            <Navbar />
            <main className="landing-main-content">
                <Hero />
                <CoreIntelligence />
                <HowItWorks />
                <Integrations />
                <Pricing />
                <FAQ />
            </main>
            <Footer />
        </div>
    );
}

export default LandingPage;