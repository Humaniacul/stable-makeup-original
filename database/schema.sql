-- Beautify AI App Database Schema
-- Run this in your Supabase SQL Editor

-- ===== USERS TABLE =====
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    points INTEGER DEFAULT 0,
    member_since TIMESTAMPTZ DEFAULT NOW(),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ===== MAKEUP LOOKS TABLE =====
CREATE TABLE public.makeup_looks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    original_image_url TEXT NOT NULL,
    transformed_image_url TEXT,
    makeup_style TEXT NOT NULL,
    products_used JSONB DEFAULT '[]',
    ai_confidence DECIMAL(3,2),
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for makeup_looks table
ALTER TABLE public.makeup_looks ENABLE ROW LEVEL SECURITY;

-- Users can manage their own makeup looks
CREATE POLICY "Users can view own makeup looks" ON public.makeup_looks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own makeup looks" ON public.makeup_looks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own makeup looks" ON public.makeup_looks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own makeup looks" ON public.makeup_looks
    FOR DELETE USING (auth.uid() = user_id);

-- ===== FAVORITES TABLE =====
CREATE TABLE public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('makeup_look', 'product', 'style')),
    item_id TEXT NOT NULL,
    item_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for favorites table
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Users can manage their own favorites
CREATE POLICY "Users can view own favorites" ON public.favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON public.favorites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON public.favorites
    FOR DELETE USING (auth.uid() = user_id);

-- ===== POINTS HISTORY TABLE =====
CREATE TABLE public.points_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    points_added INTEGER NOT NULL,
    reason TEXT NOT NULL,
    total_points_after INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for points_history table
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own points history
CREATE POLICY "Users can view own points history" ON public.points_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert points history" ON public.points_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===== USER SETTINGS TABLE =====
CREATE TABLE public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    dark_mode_enabled BOOLEAN DEFAULT TRUE,
    location_enabled BOOLEAN DEFAULT FALSE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    beauty_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for user_settings table
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own settings
CREATE POLICY "Users can view own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- ===== MAKEUP PRODUCTS TABLE =====
CREATE TABLE public.makeup_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT NOT NULL, -- lipstick, foundation, eyeshadow, etc.
    color_hex TEXT,
    price DECIMAL(10,2),
    image_url TEXT,
    description TEXT,
    rating DECIMAL(2,1),
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for makeup_products table (public read access)
ALTER TABLE public.makeup_products ENABLE ROW LEVEL SECURITY;

-- Anyone can view products
CREATE POLICY "Anyone can view products" ON public.makeup_products
    FOR SELECT USING (true);

-- ===== INDEXES FOR PERFORMANCE =====

-- Users table indexes
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_points ON public.users(points DESC);

-- Makeup looks table indexes
CREATE INDEX idx_makeup_looks_user_id ON public.makeup_looks(user_id);
CREATE INDEX idx_makeup_looks_created_at ON public.makeup_looks(created_at DESC);
CREATE INDEX idx_makeup_looks_style ON public.makeup_looks(makeup_style);

-- Favorites table indexes
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_favorites_item_type ON public.favorites(item_type);
CREATE INDEX idx_favorites_created_at ON public.favorites(created_at DESC);

-- Points history table indexes
CREATE INDEX idx_points_history_user_id ON public.points_history(user_id);
CREATE INDEX idx_points_history_created_at ON public.points_history(created_at DESC);

-- Products table indexes
CREATE INDEX idx_products_category ON public.makeup_products(category);
CREATE INDEX idx_products_brand ON public.makeup_products(brand);
CREATE INDEX idx_products_featured ON public.makeup_products(is_featured);
CREATE INDEX idx_products_rating ON public.makeup_products(rating DESC);

-- ===== FUNCTIONS =====

-- Function to automatically create user profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
    
    -- Create default settings
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$;

-- Trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER handle_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_makeup_looks_updated_at
    BEFORE UPDATE ON public.makeup_looks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_products_updated_at
    BEFORE UPDATE ON public.makeup_products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===== SAMPLE DATA =====

-- Insert some sample makeup products
INSERT INTO public.makeup_products (name, brand, category, color_hex, price, image_url, description, rating, is_featured) VALUES
('Velvet Matte Lipstick', 'Rare Beauty', 'lipstick', '#D42C2C', 22.00, 'https://example.com/lipstick1.jpg', 'Long-lasting matte finish lipstick', 4.5, true),
('Soft Pinch Blush', 'Rare Beauty', 'blush', '#FF9999', 25.00, 'https://example.com/blush1.jpg', 'Buildable liquid blush for natural flush', 4.7, true),
('Perfect Strokes Mascara', 'Rare Beauty', 'mascara', '#000000', 19.00, 'https://example.com/mascara1.jpg', 'Volumizing and lengthening mascara', 4.3, false),
('Liquid Touch Foundation', 'Rare Beauty', 'foundation', '#F5DEB3', 29.00, 'https://example.com/foundation1.jpg', 'Lightweight buildable coverage', 4.6, true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Beautify AI database schema created successfully! 🎉';
    RAISE NOTICE 'Tables created: users, makeup_looks, favorites, points_history, user_settings, makeup_products';
    RAISE NOTICE 'Row Level Security enabled for all tables';
    RAISE NOTICE 'Triggers and functions set up for user management';
    RAISE NOTICE 'Sample products added to get you started';
END $$; 