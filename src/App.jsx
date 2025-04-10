import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Web3Provider } from './context/Web3Context';
import NavigationBar from './components/Navbar';
import EventsList from './components/EventsList';
import CreateEvent from './components/CreateEvent';
import MyTickets from './components/MyTickets';
import Marketplace from './components/Marketplace';
import ContractActivity from './components/ContractActivity';
import contractAddress from './ethereum/address';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
    return (
        <Web3Provider>
            <Router>
                <div className="App">
                    <NavigationBar />
                    <Routes>
                        <Route path="/" element={<EventsList />} />
                        <Route path="/events" element={<EventsList />} />
                        <Route path="/create-event" element={<CreateEvent />} />
                        <Route path="/my-tickets" element={<MyTickets />} />
                        <Route path="/marketplace" element={<Marketplace />} />
                        <Route
                            path="/activity"
                            element={<ContractActivity contractAddress={contractAddress} />}
                        />
                    </Routes>
                </div>
            </Router>
        </Web3Provider>
    );
}

export default App; 