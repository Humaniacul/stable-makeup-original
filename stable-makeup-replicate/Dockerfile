FROM nvidia/cuda:11.8-devel-ubuntu20.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3.10-dev \
    python3-pip \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    ffmpeg \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set Python 3.10 as default
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1

# Upgrade pip
RUN python -m pip install --upgrade pip

# Set working directory
WORKDIR /src

# Install Python dependencies
RUN pip install \
    torch==2.0.1 \
    torchvision==0.15.2 \
    diffusers==0.21.4 \
    transformers==4.33.2 \
    accelerate==0.23.0 \
    opencv-python==4.8.1.78 \
    Pillow==10.0.0 \
    numpy==1.24.3 \
    scikit-image==0.21.0 \
    face-alignment==1.3.5 \
    mediapipe==0.10.7 \
    facexlib==0.3.0 \
    spiga==1.1.1 \
    dlib==19.24.2 \
    requests==2.31.0 \
    matplotlib==3.7.2

# Install Cog for compatibility
RUN pip install cog

# Copy prediction code
COPY predict.py /src/predict.py

# Expose port
EXPOSE 5000

# Run the prediction server
CMD ["python", "-m", "cog.server.http"] 