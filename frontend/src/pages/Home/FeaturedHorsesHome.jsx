import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, ChevronDown, Loader } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import VirtualGrid from '../../components/common/VirtualGrid';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

// Price range options with proper type checking
const PRICE_RANGES = [
    { id: 'all', label: 'All Prices', value: 'all', min: 0, max: Infinity },
    { id: 'under100k', label: 'Under ₹1,00,000', value: 'under100k', min: 0, max: 100000 },
    { id: '100k-300k', label: '₹1,00,000 - ₹3,00,000', value: '100k-300k', min: 100000, max: 300000 },
    { id: 'above300k', label: 'Above ₹3,00,000', value: 'above300k', min: 300000, max: Infinity }
];

const HorseCard = React.memo(({ horse, isFavorite, onToggleFavorite }) => (
    <Link 
        to={`/horses/${horse._id}`}
        className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
    >
        <div className="relative aspect-[4/3] overflow-hidden">
            <img
                src={horse.images?.[0]?.url || '/images/placeholder-horse.jpg'}
                alt={horse.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
            />
            <button
                onClick={(e) => {
                    e.preventDefault();
                    onToggleFavorite(horse._id);
                }}
                className="absolute top-2 right-2 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
            >
                <Heart 
                    className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
                />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <p className="text-white font-semibold">{horse.name}</p>
                <p className="text-white/90 text-sm">
                    {horse.breed} • {horse.age?.years || 0} years
                </p>
            </div>
        </div>
        <div className="p-4">
            <div className="flex justify-between items-center">
                <p className="text-primary font-bold">
                    ₹{horse.price?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-tertiary/70">
                    {horse.location?.city || 'Location N/A'}
                </p>
            </div>
        </div>
    </Link>
));

const ITEMS_PER_PAGE = 12;

const FeaturedHorsesHome = ({ horses = [], breeds = [] }) => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBreed, setSelectedBreed] = useState('');
    const [selectedPrice, setSelectedPrice] = useState('all');
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch user's favorites on mount
    useEffect(() => {
        const fetchFavorites = async () => {
            if (!isAuthenticated) {
                setLoading(false);
                return;
            }
            try {
                const response = await api.users.getFavorites();
                if (response?.data?.success) {
                    const favoriteIds = response.data.favorites.map(horse => horse._id);
                    setFavorites(favoriteIds);
                }
            } catch (error) {
                console.error('Error fetching favorites:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, [isAuthenticated]);

    const debouncedSearch = useDebounce(searchTerm, 300);

    const toggleFavorite = useCallback(async (horseId) => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: window.location.pathname } });
            return;
        }

        try {
            const response = await api.horses.toggleFavorite(horseId);
            if (response?.data?.success) {
                setFavorites(prev => 
                    prev.includes(horseId) 
                        ? prev.filter(id => id !== horseId)
                        : [...prev, horseId]
                );
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    }, [isAuthenticated, navigate]);

    const filteredHorses = useMemo(() => {
        return horses.filter(horse => {
            const horseName = (horse.name || '').toLowerCase();
            const horseBreed = (horse.breed || '').toLowerCase();
            const searchQuery = debouncedSearch.toLowerCase();
            
            const matchesSearch = horseName.includes(searchQuery) ||
                horseBreed.includes(searchQuery);
            
            const matchesBreed = !selectedBreed || selectedBreed === 'All Breeds' ||
                horse.breed === selectedBreed;
            
            const selectedPriceRange = PRICE_RANGES.find(range => range.value === selectedPrice) || PRICE_RANGES[0];
            const horsePrice = horse.price || 0;
            const matchesPrice = selectedPrice === 'all' || (
                horsePrice >= selectedPriceRange.min && 
                horsePrice <= selectedPriceRange.max
            );

            return matchesSearch && matchesBreed && matchesPrice;
        });
    }, [horses, debouncedSearch, selectedBreed, selectedPrice]);

    // Calculate pagination
    const totalPages = Math.ceil(filteredHorses.length / ITEMS_PER_PAGE);
    const paginatedHorses = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredHorses.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredHorses, currentPage]);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedBreed, selectedPrice]);

    const renderHorseCard = useCallback(({ index, style }) => (
        <div key={paginatedHorses[index]._id} style={style}>
            <HorseCard 
                horse={paginatedHorses[index]}
                isFavorite={favorites.includes(paginatedHorses[index]._id)}
                onToggleFavorite={toggleFavorite}
            />
        </div>
    ), [paginatedHorses, favorites, toggleFavorite]);

    // Prepare breeds for select dropdown
    const availableBreeds = useMemo(() => {
        const uniqueBreeds = new Set(horses.map(horse => horse.breed).filter(Boolean));
        return Array.from(uniqueBreeds);
    }, [horses]);

    return (
        <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4">
                {/* Section Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-tertiary">Featured Horses</h2>
                        <p className="text-tertiary/70 mt-1">
                            Discover our handpicked selection of premium horses
                        </p>
                    </div>
                    <div className="text-sm text-tertiary">
                        Showing {filteredHorses.length} of {horses.length} horses
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    {/* Search */}
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search horses..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-secondary rounded-md focus:outline-none focus:border-primary"
                        />
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-tertiary" />
                    </div>

                    {/* Breed Filter */}
                    <select
                        value={selectedBreed}
                        onChange={(e) => setSelectedBreed(e.target.value)}
                        className="px-4 py-2 border border-secondary rounded-md focus:outline-none focus:border-primary min-w-[200px]"
                    >
                        <option value="All Breeds">All Breeds</option>
                        {availableBreeds.map(breed => (
                            <option key={breed} value={breed}>{breed}</option>
                        ))}
                    </select>

                    {/* Price Filter */}
                    <select
                        value={selectedPrice}
                        onChange={(e) => setSelectedPrice(e.target.value)}
                        className="px-4 py-2 border border-secondary rounded-md focus:outline-none focus:border-primary min-w-[200px]"
                    >
                        {PRICE_RANGES.map(range => (
                            <option key={range.id} value={range.value}>
                                {range.label}
                            </option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        <VirtualGrid
                            itemCount={paginatedHorses.length}
                            itemHeight={400}
                            columnCount={3}
                            gap={24}
                            renderItem={renderHorseCard}
                        />

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="mt-8 flex justify-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 border border-primary rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary hover:text-white transition-colors"
                                >
                                    Previous
                                </button>
                                <div className="flex items-center gap-2">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-10 h-10 rounded-md ${
                                                currentPage === page
                                                    ? 'bg-primary text-white'
                                                    : 'border border-primary hover:bg-primary hover:text-white'
                                            } transition-colors`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 border border-primary rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary hover:text-white transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
};

export default React.memo(FeaturedHorsesHome);