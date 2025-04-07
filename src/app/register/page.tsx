"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription
} from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Mail,
  Phone,
  Building,
  FileText
} from "lucide-react";

export default function EnhancedRegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading, error } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [success, setSuccess] = useState<boolean>(false);

  // Basic account information
  const [accountData, setAccountData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Personal information
  const [personalData, setPersonalData] = useState({
    fullName: "",
    phoneNumber: "",
    position: "",
    department: "",
    address: "",
  });

  // Professional information
  const [professionalData, setProfessionalData] = useState({
    bio: "",
    skills: "",
    experience: "",
    preferredRole: "guest", // Default role
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Available roles - by default, this sets users as "guest"
  // Admin can later change this through the database
  const availableRoles = [
    { value: "guest", label: "Guest User" },
    { value: "pic", label: "PIC (Person in Charge)" },
    { value: "staff", label: "Staff" },
  ];

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Handle account data changes
  const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAccountData(prev => ({ ...prev, [name]: value }));

    // Clear validation error when field is updated
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle personal data changes
  const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPersonalData(prev => ({ ...prev, [name]: value }));
  };

  // Handle professional data changes
  const handleProfessionalChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfessionalData(prev => ({ ...prev, [name]: value }));
  };

  // Handle role selection
  const handleRoleChange = (value: string) => {
    setProfessionalData(prev => ({ ...prev, preferredRole: value }));
  };

  // Validate form data
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate account information
    if (!accountData.name.trim()) {
      errors.name = "Username is required";
    }

    if (!accountData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(accountData.email)) {
      errors.email = "Email address is invalid";
    }

    if (!accountData.password) {
      errors.password = "Password is required";
    } else if (accountData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (accountData.password !== accountData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    // Set validation errors
    setFormErrors(errors);

    // Return true if no errors
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      setActiveTab("account"); // Switch to account tab if there are errors
      return;
    }

    try {
      // Register with basic credentials
      // We'll also send additional data that can be stored in a metadata field
      const registered = await register(
        accountData.name,
        accountData.email,
        accountData.password,
        {
          // Include additional user data
          fullName: personalData.fullName || accountData.name,
          phoneNumber: personalData.phoneNumber,
          position: personalData.position,
          department: personalData.department,
          address: personalData.address,
          bio: professionalData.bio,
          skills: professionalData.skills,
          experience: professionalData.experience,
          role: professionalData.preferredRole,
          metadata: JSON.stringify({
            fullName: personalData.fullName || accountData.name,
            phoneNumber: personalData.phoneNumber,
            position: personalData.position,
            department: personalData.department,
            address: personalData.address,
            bio: professionalData.bio,
            skills: professionalData.skills,
            experience: professionalData.experience,
            preferredRole: professionalData.preferredRole,
          })
        }
      );

      if (registered) {
        setSuccess(true);

        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err) {
      console.error("Registration error:", err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Registration Successful</CardTitle>
            <CardDescription className="text-center">
              Your account has been created successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4 py-6">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h3 className="text-xl font-semibold">Welcome, {accountData.name}!</h3>
              <p className="text-center text-gray-500">
                Your account has been created. Redirecting to login...
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/login">Continue to Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Create an Account</CardTitle>
          <CardDescription className="text-center">
            Register to access the financial management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="professional">Professional</TabsTrigger>
              </TabsList>

              {/* Account Information Tab */}
              <TabsContent value="account" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Username
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={accountData.name}
                      onChange={handleAccountChange}
                      placeholder="Enter a username"
                      className={formErrors.name ? "border-red-500" : ""}
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-xs">{formErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={accountData.email}
                      onChange={handleAccountChange}
                      placeholder="name@example.com"
                      className={formErrors.email ? "border-red-500" : ""}
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-xs">{formErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={accountData.password}
                      onChange={handleAccountChange}
                      placeholder="Create a password"
                      className={formErrors.password ? "border-red-500" : ""}
                    />
                    {formErrors.password && (
                      <p className="text-red-500 text-xs">{formErrors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={accountData.confirmPassword}
                      onChange={handleAccountChange}
                      placeholder="Confirm your password"
                      className={formErrors.confirmPassword ? "border-red-500" : ""}
                    />
                    {formErrors.confirmPassword && (
                      <p className="text-red-500 text-xs">{formErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="button"
                    onClick={() => setActiveTab("personal")}
                  >
                    Next: Personal Info
                  </Button>
                </div>
              </TabsContent>

              {/* Personal Information Tab */}
              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Full Name
                    </Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={personalData.fullName}
                      onChange={handlePersonalChange}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" /> Phone Number
                    </Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      value={personalData.phoneNumber}
                      onChange={handlePersonalChange}
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="position" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Job Position
                      </Label>
                      <Input
                        id="position"
                        name="position"
                        value={personalData.position}
                        onChange={handlePersonalChange}
                        placeholder="Enter your job position"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department" className="flex items-center gap-2">
                        <Building className="h-4 w-4" /> Department
                      </Label>
                      <Input
                        id="department"
                        name="department"
                        value={personalData.department}
                        onChange={handlePersonalChange}
                        placeholder="Enter your department"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={personalData.address}
                      onChange={handlePersonalChange}
                      placeholder="Enter your address"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("account")}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab("professional")}
                  >
                    Next: Professional Info
                  </Button>
                </div>
              </TabsContent>

              {/* Professional Information Tab */}
              <TabsContent value="professional" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio / About Me</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={professionalData.bio}
                      onChange={handleProfessionalChange}
                      placeholder="Tell us about yourself"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skills">Key Skills</Label>
                    <Input
                      id="skills"
                      name="skills"
                      value={professionalData.skills}
                      onChange={handleProfessionalChange}
                      placeholder="Enter your key skills (e.g., Video Editing, Design, Project Management)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience">Relevant Experience</Label>
                    <Textarea
                      id="experience"
                      name="experience"
                      value={professionalData.experience}
                      onChange={handleProfessionalChange}
                      placeholder="Briefly describe your relevant experience"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredRole">Preferred Role</Label>
                    <Select
                      value={professionalData.preferredRole}
                      onValueChange={handleRoleChange}
                    >
                      <SelectTrigger id="preferredRole">
                        <SelectValue placeholder="Select your preferred role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Note: Role requests are subject to admin approval. All users start with guest access.
                    </p>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("personal")}
                  >
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Complete Registration"
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <div className="text-sm text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Login
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}