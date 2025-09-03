// src/pages/CountryPage.jsx
import { useParams } from 'react-router-dom';
import { ClientGrid } from '../components/ClientGrid';

// Page for displaying and managing clients for a specific country
const CountryPage = () => {
  // Get country name from URL
  const { countryName } = useParams();

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-6">{countryName}</h1>
      
      <div className="bg-white rounded-lg shadow-md">
        <ClientGrid countryName={countryName} />
      </div>
    </div>
  );
};

export default CountryPage;