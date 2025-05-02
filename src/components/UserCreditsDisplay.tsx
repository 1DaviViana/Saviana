import React from 'react';
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { 
  UserCircle, 
  LogIn, 
  CreditCard, 
  ChevronDown 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface UserCreditsDisplayProps {
  credits: number;
  isLoggedIn?: boolean;
  userName?: string;
}

export default function UserCreditsDisplay({ 
  credits, 
  isLoggedIn = false, 
  userName = "" 
}: UserCreditsDisplayProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="px-2 py-1 flex items-center gap-1 text-xs">
        <CreditCard className="h-3 w-3 text-primary" />
        {`R$ ${credits.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      </Badge>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <UserCircle className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          {isLoggedIn ? (
            <>
              <DropdownMenuItem>
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>+ Créditos</span>
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem>
              <LogIn className="mr-2 h-4 w-4" />
              <span>Entrar</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}