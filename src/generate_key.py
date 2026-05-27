"""Generate license keys for Planer. Run: python generate_key.py <seed>"""
import sys

from license import make_license_key

if __name__ == "__main__":
    seed = sys.argv[1] if len(sys.argv) > 1 else "customer-001"
    print(make_license_key(seed))
