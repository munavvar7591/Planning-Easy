import os
import zlib
import struct
import math

def make_png(width, height, draw_func):
    """Generates an RGBA PNG without third party dependencies."""
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0) # filter byte 0 (None)
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    # Compress raw data
    compressed = zlib.compress(bytes(raw_data), 9)
    
    # PNG signature
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = struct.pack('>I', zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff)
    png.extend(struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + ihdr_crc)
    
    # IDAT chunk
    idat_crc = struct.pack('>I', zlib.crc32(b'IDAT' + compressed) & 0xffffffff)
    png.extend(struct.pack('>I', len(compressed)) + b'IDAT' + compressed + idat_crc)
    
    # IEND chunk
    iend_crc = struct.pack('>I', zlib.crc32(b'IEND') & 0xffffffff)
    png.extend(struct.pack('>I', 0) + b'IEND' + iend_crc)
    
    return bytes(png)

def draw_icon(x, y, width, height):
    # Normalized coordinates (-1 to 1)
    nx = (x / width) * 2 - 1
    ny = (y / height) * 2 - 1
    dist = math.sqrt(nx*nx + ny*ny)
    
    # Rounded rect background (Primary: #1e3a8a to #2563eb gradient)
    corner_r = 0.82
    box_dist = max(abs(nx), abs(ny))
    
    # Background color gradient
    t = (ny + 1) / 2 # 0 at top, 1 at bottom
    bg_r = int(30 + (37 - 30) * t)
    bg_g = int(58 + (99 - 58) * t)
    bg_b = int(138 + (235 - 138) * t)
    
    # Check if inside rounded squircle
    # Superellipse: |nx|^4 + |ny|^4 <= 0.75^4
    if (abs(nx)**3.8 + abs(ny)**3.8) > (0.85**3.8):
        return 0, 0, 0, 0
    
    # Draw Logo Icon inside: Stylized 'P' & 'E' / Organization Group Check
    # Center circle badge
    if dist < 0.52 and dist > 0.44:
        return 255, 255, 255, 255
    
    # Draw 'P' symbol
    # Vertical stem
    if -0.28 <= nx <= -0.16 and -0.32 <= ny <= 0.32:
        return 255, 255, 255, 255
    
    # 'P' loop
    p_cx, p_cy = -0.16, -0.14
    p_dist = math.sqrt((nx - p_cx)**2 + (ny - p_cy)**2)
    if 0.10 <= p_dist <= 0.22 and nx >= -0.18:
        return 255, 255, 255, 255
        
    # 'E' symbol or Checkmark accents on right
    if 0.04 <= nx <= 0.26:
        # Top bar
        if -0.32 <= ny <= -0.20:
            return 96, 165, 250, 255
        # Middle bar
        if -0.06 <= ny <= 0.06 and nx <= 0.20:
            return 96, 165, 250, 255
        # Bottom bar
        if 0.20 <= ny <= 0.32:
            return 96, 165, 250, 255
        # Vertical spine of E
        if 0.04 <= nx <= 0.12 and -0.32 <= ny <= 0.32:
            return 96, 165, 250, 255
            
    return bg_r, bg_g, bg_b, 255

os.makedirs('c:/anti test/app-1/icons', exist_ok=True)

print("Generating 192x192 icon...")
png192 = make_png(192, 192, draw_icon)
with open('c:/anti test/app-1/icons/icon-192.png', 'wb') as f:
    f.write(png192)

print("Generating 512x512 icon...")
png512 = make_png(512, 512, draw_icon)
with open('c:/anti test/app-1/icons/icon-512.png', 'wb') as f:
    f.write(png512)

with open('c:/anti test/app-1/icons/icon-maskable.png', 'wb') as f:
    f.write(png512)

print("Icons generated successfully!")
